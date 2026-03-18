"""
Playbook Event-Sourcing Service

Provides helpers to persist playbook mutation events with
auto-incremented per-playbook sequence numbers, query event
deltas, and fold events back into a snapshot.
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import logging

from app.models.playbook_event import PlaybookEvent
from app.models.playbook import Playbook

logger = logging.getLogger(__name__)


async def get_next_sequence(playbook_id: str, db: AsyncSession) -> int:
    """
    Return the next sequence_number for *playbook_id*.

    This is ``MAX(sequence_number) + 1`` among existing events,
    or ``1`` if no events exist yet.
    """
    result = await db.execute(
        select(func.max(PlaybookEvent.sequence_number))
        .where(PlaybookEvent.playbook_id == playbook_id)
    )
    current_max = result.scalar()
    return (current_max or 0) + 1


async def save_event(
    playbook_id: str,
    user_id: Optional[str],
    event_type: str,
    data: dict,
    db: AsyncSession,
) -> PlaybookEvent:
    """
    Persist a new PlaybookEvent with an auto-incremented sequence number.

    Returns the flushed (but not yet committed) event so the caller
    can bundle it inside a larger transaction.
    """
    seq = await get_next_sequence(playbook_id, db)
    event = PlaybookEvent(
        playbook_id=playbook_id,
        user_id=user_id,
        event_type=event_type,
        data=data,
        sequence_number=seq,
    )
    db.add(event)
    await db.flush()
    logger.debug(
        "Saved event #%d type=%s for playbook %s",
        seq, event_type, playbook_id,
    )
    return event


async def get_events_since(
    playbook_id: str,
    since_sequence: int,
    db: AsyncSession,
) -> List[PlaybookEvent]:
    """
    Return all events for *playbook_id* whose ``sequence_number``
    is strictly greater than *since_sequence*, ordered ascending.
    """
    result = await db.execute(
        select(PlaybookEvent)
        .where(PlaybookEvent.playbook_id == playbook_id)
        .where(PlaybookEvent.sequence_number > since_sequence)
        .order_by(PlaybookEvent.sequence_number)
    )
    return list(result.scalars().all())


async def create_snapshot(
    playbook_id: str,
    content: dict,
    sequence_number: int,
    db: AsyncSession,
) -> Playbook:
    """
    Update the playbook's ``content`` (the full snapshot) and set
    ``snapshot_sequence`` to *sequence_number* so future delta
    queries skip already-folded events.
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one()
    playbook.content = content
    playbook.snapshot_sequence = sequence_number
    await db.flush()
    logger.info(
        "Snapshot updated for playbook %s at sequence %d",
        playbook_id, sequence_number,
    )
    return playbook
