from app.models.story import generate_match_story


def test_story_prematch():
    story = generate_match_story("pre", "Liverpool", "Arsenal", 0, 0, 0.0, 0.0)
    assert story == []


def test_story_winner_better_xg():
    story = generate_match_story(
        status="post",
        home_name="Liverpool",
        away_name="Everton",
        home_score=2,
        away_score=0,
        home_xg=2.4,
        away_xg=0.5,
    )
    assert len(story) == 1
    assert "beat Everton 2-0 and deserved it" in story[0]
    assert "(2.4 vs 0.5 expected goals)" in story[0]


def test_story_winner_worse_xg():
    # Like Liverpool 0-1 Arsenal
    story = generate_match_story(
        status="post",
        home_name="Liverpool",
        away_name="Arsenal",
        home_score=0,
        away_score=1,
        home_xg=1.3,
        away_xg=0.8,
        biggest_moment={
            "player": "Kai Havertz",
            "event_type": "goal",
            "minute": "16'",
            "team": "Arsenal",
            "from_pct": 28,
            "to_pct": 52,
        },
    )
    assert len(story) == 2
    assert "Arsenal beat Liverpool 1-0, but Liverpool created the better chances" in story[0]
    assert "Arsenal took theirs; Liverpool didn't." in story[0]
    assert "Biggest moment: Kai Havertz's goal (16') took Arsenal from 28% to 52%." in story[1]


def test_story_draw_close():
    story = generate_match_story(
        status="post",
        home_name="Chelsea",
        away_name="Tottenham",
        home_score=1,
        away_score=1,
        home_xg=1.1,
        away_xg=1.2,
    )
    assert len(story) == 1
    assert "drew 1-1. Both teams created similar chances." in story[0]


def test_story_live_leading():
    story = generate_match_story(
        status="in",
        home_name="Arsenal",
        away_name="Chelsea",
        home_score=2,
        away_score=1,
        home_xg=1.8,
        away_xg=0.9,
        minute_label="65'",
        win_prob={"home": 0.78, "draw": 0.15, "away": 0.07},
    )
    assert len(story) == 1
    assert "Arsenal lead 2-1 after 65'. Right now they have a 78% chance of winning." in story[0]
