from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app.community_schema import COMMUNITY_TABLES


def community_storage_ready(engine) -> bool:
    """Read only; never create tables or reveal connections, records or credentials."""
    try:
        existing = set(inspect(engine).get_table_names())
        return all(table.name in existing for table in COMMUNITY_TABLES)
    except SQLAlchemyError:
        return False
