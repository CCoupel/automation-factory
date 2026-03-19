"""
Tests for PlaybookEvent model and Playbook.snapshot_sequence column.
"""

import pytest
import pytest_asyncio
from sqlalchemy import select, text

from app.models.playbook_event import PlaybookEvent
from app.models.playbook import Playbook


# ---------------------------------------------------------------------------
# PlaybookEvent model tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_playbook_event(test_session, test_playbook, test_user):
    """A PlaybookEvent can be created and persisted."""
    event = PlaybookEvent(
        playbook_id=test_playbook.id,
        user_id=test_user.id,
        event_type="module_add",
        data={"module": "apt", "position": {"x": 100, "y": 200}},
        sequence_number=1,
    )
    test_session.add(event)
    await test_session.commit()
    await test_session.refresh(event)

    assert event.id is not None
    assert event.playbook_id == test_playbook.id
    assert event.user_id == test_user.id
    assert event.event_type == "module_add"
    assert event.data["module"] == "apt"
    assert event.sequence_number == 1
    assert event.created_at is not None


@pytest.mark.asyncio
async def test_playbook_event_to_dict(test_session, test_playbook, test_user):
    """to_dict returns all expected fields."""
    event = PlaybookEvent(
        playbook_id=test_playbook.id,
        user_id=test_user.id,
        event_type="link_delete",
        data={"link_id": "abc-123"},
        sequence_number=2,
    )
    test_session.add(event)
    await test_session.commit()
    await test_session.refresh(event)

    d = event.to_dict()
    assert set(d.keys()) == {
        "id", "playbook_id", "user_id", "event_type",
        "data", "sequence_number", "created_at",
    }
    assert d["event_type"] == "link_delete"
    assert d["sequence_number"] == 2


@pytest.mark.asyncio
async def test_sequence_unique_per_playbook(test_session, test_playbook, test_user):
    """Two events with the same (playbook_id, sequence_number) should conflict."""
    e1 = PlaybookEvent(
        playbook_id=test_playbook.id,
        user_id=test_user.id,
        event_type="play_update",
        data={},
        sequence_number=1,
    )
    e2 = PlaybookEvent(
        playbook_id=test_playbook.id,
        user_id=test_user.id,
        event_type="module_add",
        data={},
        sequence_number=1,
    )
    test_session.add(e1)
    await test_session.commit()

    test_session.add(e2)
    with pytest.raises(Exception):
        await test_session.commit()
    await test_session.rollback()


@pytest.mark.asyncio
async def test_multiple_events_ordered(test_session, test_playbook, test_user):
    """Events can be queried in sequence order."""
    for i in range(1, 4):
        test_session.add(PlaybookEvent(
            playbook_id=test_playbook.id,
            user_id=test_user.id,
            event_type=f"action_{i}",
            data={"step": i},
            sequence_number=i,
        ))
    await test_session.commit()

    result = await test_session.execute(
        select(PlaybookEvent)
        .where(PlaybookEvent.playbook_id == test_playbook.id)
        .order_by(PlaybookEvent.sequence_number)
    )
    events = result.scalars().all()
    assert len(events) == 3
    assert [e.sequence_number for e in events] == [1, 2, 3]


@pytest.mark.asyncio
async def test_event_nullable_user(test_session, test_playbook):
    """user_id can be NULL (system-generated events)."""
    event = PlaybookEvent(
        playbook_id=test_playbook.id,
        user_id=None,
        event_type="system_snapshot",
        data={},
        sequence_number=1,
    )
    test_session.add(event)
    await test_session.commit()
    await test_session.refresh(event)
    assert event.user_id is None


# ---------------------------------------------------------------------------
# Playbook.snapshot_sequence tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_playbook_snapshot_sequence_default(test_session, test_user):
    """New playbooks have snapshot_sequence = 0 by default."""
    pb = Playbook(
        name="Fresh Playbook",
        content={"plays": []},
        owner_id=test_user.id,
    )
    test_session.add(pb)
    await test_session.commit()
    await test_session.refresh(pb)
    assert pb.snapshot_sequence == 0


@pytest.mark.asyncio
async def test_playbook_snapshot_sequence_update(test_session, test_playbook):
    """snapshot_sequence can be updated."""
    test_playbook.snapshot_sequence = 42
    await test_session.commit()
    await test_session.refresh(test_playbook)
    assert test_playbook.snapshot_sequence == 42
