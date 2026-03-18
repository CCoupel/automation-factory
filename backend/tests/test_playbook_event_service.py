"""
Tests for playbook_event_service.
"""

import pytest
from sqlalchemy import select

from app.services import playbook_event_service as svc
from app.models.playbook_event import PlaybookEvent
from app.models.playbook import Playbook


# ---------------------------------------------------------------------------
# get_next_sequence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_next_sequence_empty(test_session, test_playbook):
    """Returns 1 when no events exist."""
    seq = await svc.get_next_sequence(test_playbook.id, test_session)
    assert seq == 1


@pytest.mark.asyncio
async def test_get_next_sequence_after_events(test_session, test_playbook, test_user):
    """Returns max + 1 after inserting events."""
    for i in range(1, 4):
        test_session.add(PlaybookEvent(
            playbook_id=test_playbook.id,
            user_id=test_user.id,
            event_type="action",
            data={},
            sequence_number=i,
        ))
    await test_session.commit()

    seq = await svc.get_next_sequence(test_playbook.id, test_session)
    assert seq == 4


# ---------------------------------------------------------------------------
# save_event
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_save_event(test_session, test_playbook, test_user):
    """save_event persists an event with auto sequence."""
    event = await svc.save_event(
        playbook_id=test_playbook.id,
        user_id=test_user.id,
        event_type="module_add",
        data={"module": "apt"},
        db=test_session,
    )
    await test_session.commit()

    assert event.sequence_number == 1
    assert event.event_type == "module_add"
    assert event.data["module"] == "apt"


@pytest.mark.asyncio
async def test_save_event_increments(test_session, test_playbook, test_user):
    """Successive save_event calls increment the sequence."""
    e1 = await svc.save_event(test_playbook.id, test_user.id, "a", {}, test_session)
    e2 = await svc.save_event(test_playbook.id, test_user.id, "b", {}, test_session)
    await test_session.commit()

    assert e1.sequence_number == 1
    assert e2.sequence_number == 2


# ---------------------------------------------------------------------------
# get_events_since
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_events_since(test_session, test_playbook, test_user):
    """Returns only events after the given sequence."""
    for i in range(1, 6):
        test_session.add(PlaybookEvent(
            playbook_id=test_playbook.id,
            user_id=test_user.id,
            event_type=f"action_{i}",
            data={},
            sequence_number=i,
        ))
    await test_session.commit()

    events = await svc.get_events_since(test_playbook.id, 3, test_session)
    assert len(events) == 2
    assert [e.sequence_number for e in events] == [4, 5]


@pytest.mark.asyncio
async def test_get_events_since_zero(test_session, test_playbook, test_user):
    """since_sequence=0 returns all events."""
    for i in range(1, 4):
        test_session.add(PlaybookEvent(
            playbook_id=test_playbook.id,
            user_id=test_user.id,
            event_type="x",
            data={},
            sequence_number=i,
        ))
    await test_session.commit()

    events = await svc.get_events_since(test_playbook.id, 0, test_session)
    assert len(events) == 3


# ---------------------------------------------------------------------------
# create_snapshot
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_snapshot(test_session, test_playbook):
    """create_snapshot updates content and snapshot_sequence."""
    new_content = {"plays": [{"name": "Play 1"}]}
    pb = await svc.create_snapshot(
        playbook_id=test_playbook.id,
        content=new_content,
        sequence_number=10,
        db=test_session,
    )
    await test_session.commit()
    await test_session.refresh(pb)

    assert pb.content == new_content
    assert pb.snapshot_sequence == 10
