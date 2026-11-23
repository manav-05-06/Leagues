from pydantic import BaseModel

from app.models.momentum import calculate_momentum_wave


class MockShot(BaseModel):
    minute: int
    team_id: str
    xg: float


class MockEvent(BaseModel):
    minute: int
    team_id: str
    type: str
    x: float | None = None


def test_momentum_peaks_with_shots():
    # Home team has heavy pressure around minute 25-27 with high xG shots
    shots = [
        MockShot(minute=25, team_id="home", xg=0.45),
        MockShot(minute=26, team_id="home", xg=0.65),
        # Away team has a chance at minute 75
        MockShot(minute=75, team_id="away", xg=0.50),
    ]
    events = [
        MockEvent(minute=24, team_id="home", type="corner", x=99.0),
        MockEvent(minute=25, team_id="home", type="foul", x=75.0),
    ]

    wave = calculate_momentum_wave(
        shots=shots,
        events=events,
        home_team_id="home",
        away_team_id="away",
        max_minute=90,
    )

    assert len(wave) == 90

    # Around minute 25-26, momentum should be strongly positive (home dominance)
    pt_26 = next(p for p in wave if p["minute"] == 26)
    assert pt_26["momentum"] > 0.3

    # Around minute 75, momentum should be negative (away dominance)
    pt_75 = next(p for p in wave if p["minute"] == 75)
    assert pt_75["momentum"] < 0.0
