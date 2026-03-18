"""
PlaybookEvent model for event-sourcing playbook mutations.

Each user action (add module, delete link, update play, etc.) is recorded
as an immutable event with a per-playbook sequence number.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, BigInteger, Index
from datetime import datetime
import uuid
from app.core.database import Base


def generate_uuid():
    """Generate UUID as string"""
    return str(uuid.uuid4())


class PlaybookEvent(Base):
    """
    Immutable event representing a single mutation on a playbook.

    Attributes:
        id: Unique event identifier (UUID)
        playbook_id: Target playbook
        user_id: User who triggered the event
        event_type: Short action label (module_add, link_delete, play_update, ...)
        data: Arbitrary JSON payload describing the mutation
        sequence_number: Monotonically increasing per playbook
        created_at: Timestamp of the event
    """

    __tablename__ = "playbook_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    playbook_id = Column(
        String,
        ForeignKey("playbooks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_type = Column(String(50), nullable=False)
    data = Column(JSON, nullable=True)
    sequence_number = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_playbook_events_pb_seq", "playbook_id", "sequence_number", unique=True),
    )

    def __repr__(self):
        return (
            f"<PlaybookEvent #{self.sequence_number} "
            f"type={self.event_type} playbook={self.playbook_id}>"
        )

    def to_dict(self):
        return {
            "id": self.id,
            "playbook_id": self.playbook_id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "data": self.data,
            "sequence_number": self.sequence_number,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
