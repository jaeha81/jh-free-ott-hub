"""
SQLite에 rating/runtime/popularity 컬럼 추가 스크립트.
ALTER TABLE ADD COLUMN 사용 (SQLite 지원).
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "free_ott_hub.db")
DB_PATH = os.path.abspath(DB_PATH)

COLUMNS = [
    ("vote_average", "FLOAT DEFAULT 0"),
    ("vote_count", "INTEGER DEFAULT 0"),
    ("runtime", "INTEGER DEFAULT 0"),
    ("popularity", "FLOAT DEFAULT 0"),
]


def main():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] DB 파일 없음: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 기존 컬럼 확인
    cursor.execute("PRAGMA table_info(contents)")
    existing = {row[1] for row in cursor.fetchall()}
    print(f"[INFO] 기존 컬럼: {existing}")

    for col_name, col_def in COLUMNS:
        if col_name in existing:
            print(f"[SKIP] {col_name} 이미 존재")
        else:
            sql = f"ALTER TABLE contents ADD COLUMN {col_name} {col_def}"
            cursor.execute(sql)
            print(f"[ADD] {col_name} {col_def}")

    conn.commit()
    conn.close()
    print("[DONE] 컬럼 추가 완료")


if __name__ == "__main__":
    main()
