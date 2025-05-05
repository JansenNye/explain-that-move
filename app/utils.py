import hashlib

def cache_key(fen: str, depth: int) -> str:
    """
    Create a short Redis key that uniquely identifies (fen, depth).
    """
    digest = hashlib.sha256(f"{fen}-{depth}".encode()).hexdigest()[:32]
    return f"sf:{depth}:{digest}"
