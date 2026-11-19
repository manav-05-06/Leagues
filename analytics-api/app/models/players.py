from typing import Any

from pydantic import BaseModel, Field


class PlayerStats(BaseModel):
    id: str
    name: str
    jersey: str = ""
    team_id: str
    team_name: str
    position: str = "Unknown"
    position_group: str = "M"  # G, D, M, F
    starter: bool = False
    formation_place: int | None = None
    subbed_in: bool = False
    subbed_out: bool = False
    yellow_cards: int = 0
    red_cards: int = 0
    # Core Attacking & Tactical metrics
    xg: float = 0.0
    shots: int = 0
    shots_on_target: int = 0
    goals: int = 0
    assists: int = 0
    fouls_committed: int = 0
    fouls_won: int = 0
    # Goalkeeper metrics
    saves: int = 0
    goals_conceded: int = 0
    shots_faced_xg: float = 0.0
    goals_prevented: float | None = None


class TeamRoster(BaseModel):
    team_id: str
    team_name: str
    formation: str = "4-3-3"
    starters: list[PlayerStats] = Field(default_factory=list)
    bench: list[PlayerStats] = Field(default_factory=list)


def extract_player_statistics(
    summary: dict[str, Any],
    shots: list[Any],
    events: list[Any],
) -> tuple[list[PlayerStats], list[TeamRoster]]:
    """
    Combines ESPN roster, boxscore stats, and parsed shots/events into
    per-player metrics including xG, assists, fouls, and goalkeeper goals prevented.
    """
    rosters_data = summary.get("rosters", [])
    boxscore = summary.get("boxscore", {})
    box_teams = boxscore.get("teams", [])

    all_players: list[PlayerStats] = []
    team_rosters: list[TeamRoster] = []

    # Map team IDs
    team_id_map: dict[str, str] = {}
    for bt in box_teams:
        t_id = str(bt.get("team", {}).get("id", ""))
        d_name = bt.get("team", {}).get("displayName") or bt.get("team", {}).get("name", "")
        if t_id and d_name:
            team_id_map[d_name] = t_id

    # Pre-index shots by player_id and player_name
    shots_by_pid: dict[str, list[Any]] = {}
    shots_by_pname: dict[str, list[Any]] = {}
    for s in shots:
        pid = getattr(s, "player_id", None)
        pname = getattr(s, "player_name", "").lower().strip()
        if pid:
            shots_by_pid.setdefault(str(pid), []).append(s)
        if pname:
            shots_by_pname.setdefault(pname, []).append(s)

    # Pre-index fouls by player
    fouls_by_pid: dict[str, int] = {}
    fouls_won_by_pid: dict[str, int] = {}
    for e in events:
        pid = getattr(e, "player_id", None)
        e_type = getattr(e, "type", "")
        if pid and e_type == "foul":
            fouls_by_pid[str(pid)] = fouls_by_pid.get(str(pid), 0) + 1

    # Pre-calculate on-target shots per team for goalkeeper goals prevented
    on_target_by_team: dict[str, list[Any]] = {}
    goals_by_team: dict[str, int] = {}
    for s in shots:
        t_id = str(getattr(s, "team_id", ""))
        outcome = getattr(s, "outcome", "")
        if outcome in ("goal", "saved"):
            on_target_by_team.setdefault(t_id, []).append(s)
        if outcome == "goal":
            goals_by_team[t_id] = goals_by_team.get(t_id, 0) + 1

    # Determine home and away team IDs
    header = summary.get("header", {})
    comps = header.get("competitions", [{}])
    competitors = comps[0].get("competitors", []) if comps else []
    comp_team_ids = [str(c.get("team", {}).get("id", "")) for c in competitors]

    for r_entry in rosters_data:
        t_obj = r_entry.get("team", {})
        raw_t_name = t_obj.get("displayName") or t_obj.get("name", "")
        t_id = str(t_obj.get("id") or team_id_map.get(raw_t_name, ""))
        formation = str(r_entry.get("formation") or "4-3-3")

        # Opponent team ID
        opp_id = ""
        for cid in comp_team_ids:
            if cid and cid != t_id:
                opp_id = cid
                break

        # On-target shots faced by this team's goalkeeper(s)
        opp_on_target_shots = on_target_by_team.get(opp_id, [])
        opp_goals_scored = goals_by_team.get(opp_id, 0)
        opp_on_target_xg = sum(float(getattr(s, "xg", 0.0)) for s in opp_on_target_shots)

        starters_list: list[PlayerStats] = []
        bench_list: list[PlayerStats] = []

        for p_entry in r_entry.get("roster", []):
            ath = p_entry.get("athlete", {})
            pid = str(ath.get("id", ""))
            name = str(ath.get("displayName") or ath.get("shortName") or "Player")
            jersey = str(p_entry.get("jersey") or ath.get("jersey") or "")
            pos_obj = p_entry.get("position", {})
            pos_name = str(pos_obj.get("name") or pos_obj.get("displayName") or "Unknown")

            # Position group (G / D / M / F)
            pos_lower = pos_name.lower()
            if "goal" in pos_lower or "keeper" in pos_lower:
                pos_group = "G"
            elif "def" in pos_lower or "back" in pos_lower:
                pos_group = "D"
            elif "mid" in pos_lower:
                pos_group = "M"
            elif (
                "forw" in pos_lower
                or "strik" in pos_lower
                or "wing" in pos_lower
                or "attack" in pos_lower
            ):
                pos_group = "F"
            else:
                pos_group = "M"

            starter = bool(p_entry.get("starter", False))
            formation_place = p_entry.get("formationPlace")
            if formation_place is not None:
                try:
                    formation_place = int(formation_place)
                except (ValueError, TypeError):
                    formation_place = None

            subbed_in = bool(p_entry.get("subbedIn", False))
            subbed_out = bool(p_entry.get("subbedOut", False))

            # Stats list from ESPN
            stat_dict = {
                s.get("name"): float(s.get("value") or 0.0)
                for s in p_entry.get("stats", [])
                if s.get("name")
            }

            # Matched shots for this player
            player_shots = shots_by_pid.get(pid) or shots_by_pname.get(name.lower().strip(), [])
            calc_shots = len(player_shots)
            calc_xg = round(sum(float(getattr(s, "xg", 0.0)) for s in player_shots), 3)
            calc_on_target = sum(
                1 for s in player_shots if getattr(s, "outcome", "") in ("goal", "saved")
            )
            calc_goals = sum(1 for s in player_shots if getattr(s, "outcome", "") == "goal")

            # Fallback to ESPN stats if shots commentary lacked participant ID
            final_shots = max(calc_shots, int(stat_dict.get("totalShots", 0)))
            final_goals = max(calc_goals, int(stat_dict.get("totalGoals", 0)))
            final_on_target = max(calc_on_target, int(stat_dict.get("shotsOnTarget", 0)))
            assists = int(stat_dict.get("goalAssists", 0))
            fouls_committed = max(fouls_by_pid.get(pid, 0), int(stat_dict.get("foulsCommitted", 0)))
            fouls_won = max(fouls_won_by_pid.get(pid, 0), int(stat_dict.get("foulsSuffered", 0)))
            yellow_cards = int(stat_dict.get("yellowCards", 0))
            red_cards = int(stat_dict.get("redCards", 0))

            # Goalkeeper specific calculations
            is_gk = pos_group == "G" or formation_place == 1
            saves = int(stat_dict.get("saves", 0))
            goals_conceded = int(stat_dict.get("goalsConceded", 0))
            goals_prevented = None
            shots_faced_xg = 0.0

            if is_gk and starter:
                shots_faced_xg = round(opp_on_target_xg, 2)
                goals_conceded = max(goals_conceded, opp_goals_scored)
                goals_prevented = round(opp_on_target_xg - goals_conceded, 2)

            ps = PlayerStats(
                id=pid,
                name=name,
                jersey=jersey,
                team_id=t_id,
                team_name=raw_t_name,
                position=pos_name,
                position_group=pos_group,
                starter=starter,
                formation_place=formation_place,
                subbed_in=subbed_in,
                subbed_out=subbed_out,
                yellow_cards=yellow_cards,
                red_cards=red_cards,
                xg=calc_xg,
                shots=final_shots,
                shots_on_target=final_on_target,
                goals=final_goals,
                assists=assists,
                fouls_committed=fouls_committed,
                fouls_won=fouls_won,
                saves=saves,
                goals_conceded=goals_conceded,
                shots_faced_xg=shots_faced_xg,
                goals_prevented=goals_prevented,
            )

            all_players.append(ps)
            if starter:
                starters_list.append(ps)
            else:
                bench_list.append(ps)

        team_rosters.append(
            TeamRoster(
                team_id=t_id,
                team_name=raw_t_name,
                formation=formation,
                starters=starters_list,
                bench=bench_list,
            )
        )

    return all_players, team_rosters
