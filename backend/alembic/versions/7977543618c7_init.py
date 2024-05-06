"""init

Revision ID: 7977543618c7
Revises:
Create Date: 2024-03-24 20:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '7977543618c7'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True, index=True, autoincrement=True, nullable=False),
        sa.Column('email', sa.String(254), nullable=True, unique=True),
        sa.Column('name', sa.String(128), nullable=True),
        sa.Column('password', sa.String(128), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False)
    )

    op.create_table(
        'protocols',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, index=True, nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('author', sa.String, nullable=False),
        sa.Column('version', sa.String, nullable=False),
        sa.Column('description', sa.String, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False)
    )

    op.create_table(
        'protocol_encapsulations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, index=True, nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('protocol_id', UUID(as_uuid=True), sa.ForeignKey('protocols.id'), nullable=False),
        sa.Column('parent_protocol_id', UUID(as_uuid=True), sa.ForeignKey('protocols.id'), nullable=False),
        sa.Column('fields', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False)
    )



def downgrade() -> None:
    op.drop_table('protocol_encapsulations')
    op.drop_table('protocols')
    op.drop_table('users')
