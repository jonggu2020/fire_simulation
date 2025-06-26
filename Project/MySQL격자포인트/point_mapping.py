import os
from dotenv import load_dotenv
import mysql.connector
import psycopg2
from mysql.connector import Error as MySQLError
from psycopg2 import Error as PGError

# .env 파일 로드
load_dotenv()

# PostgreSQL 연결 정보
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")
PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT")
PG_DBNAME = os.getenv("PG_DBNAME")
PG_SCHEMA = os.getenv("PG_SCHEMA")  # 보통 'public'

# MySQL 연결 정보
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DBNAME = os.getenv("MYSQL_DBNAME")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))

def get_mysql_column_order(mysql_conn):
    """
    MySQL korea_grid 테이블의 컬럼 순서를 가져옵니다.
    """
    column_order = []
    try:
        with mysql_conn.cursor() as cursor:
            cursor.execute("SHOW COLUMNS FROM korea_grid;")
            column_order = [row[0] for row in cursor.fetchall()]
    except MySQLError as e:
        print(f"MySQL 컬럼 조회 오류: {e}")
    return column_order

def get_pg_attributes(pg_conn, pg_table):
    """
    PostgreSQL에서 지정된 테이블에서 'geom' 컬럼을 제외한 속성 칼럼명 목록을 반환합니다.
    """
    try:
        with pg_conn.cursor() as cur:
            query = """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s AND column_name != 'geom';
            """
            cur.execute(query, (PG_SCHEMA, pg_table))
            return [row[0] for row in cur.fetchall()]
    except PGError as e:
        print(f"[{pg_table}] 칼럼 조회 오류: {e}")
        return []

def update_mysql_grid_with_pg_data(pg_conn, mysql_conn):
    """
    MySQL korea_grid 테이블의 격자 좌표를 기준으로 PostgreSQL 공간 데이터를 가져와 업데이트합니다.
    """
    mapping = {
        "imsangdo": "ulsan_imsangdo",
        "soil": "ulsan_soil"
    }

    # MySQL 컬럼 순서 조회
    mysql_columns = get_mysql_column_order(mysql_conn)

    # PostgreSQL 속성 컬럼 조회
    pg_attr_map = {prefix: get_pg_attributes(pg_conn, pg_table) for prefix, pg_table in mapping.items()}

    # MySQL 모든 격자 포인트 조회
    mysql_cursor = mysql_conn.cursor(dictionary=True)
    mysql_cursor.execute("SELECT id, lat, lng FROM korea_grid;")
    grid_rows = mysql_cursor.fetchall()

    successful_mappings = 0

    # 각 격자 좌표마다 PostGIS 데이터를 매핑
    for grid in grid_rows:
        grid_id, lat, lng = grid["id"], grid["lat"], grid["lng"]

        for prefix, pg_table in mapping.items():
            attr_cols = pg_attr_map.get(prefix, [])
            if not attr_cols:
                continue

            # MySQL 컬럼 순서에 맞게 정렬
            ordered_cols = [col for col in mysql_columns if col.startswith(f"{prefix}_") and col.replace(f"{prefix}_", "") in attr_cols]

            if not ordered_cols:
                continue

            attr_str = ", ".join([col.replace(f"{prefix}_", "") for col in ordered_cols])

            # PostGIS에서 해당 좌표가 포함되는지 확인
            pg_query = f"""
                SELECT {attr_str}
                FROM {pg_table}
                WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                LIMIT 1;
            """
            pg_cur = pg_conn.cursor()
            pg_cur.execute(pg_query, (lng, lat))
            result = pg_cur.fetchone()
            pg_cur.close()

            if result:
                # MySQL 컬럼 순서대로 데이터 정렬 후 업데이트
                set_clauses = [f"`{col}` = %s" for col in ordered_cols]
                update_query = f"UPDATE korea_grid SET {', '.join(set_clauses)} WHERE id = %s;"
                update_values = list(result) + [grid_id]

                my_cur = mysql_conn.cursor()
                my_cur.execute(update_query, update_values)
                mysql_conn.commit()
                my_cur.close()

                successful_mappings += 1
                print(f"✅ Grid id {grid_id} 매핑 완료 ({pg_table}, prefix: {prefix}) → {ordered_cols}")

    mysql_cursor.close()
    print(f"\n🌟 최종적으로 {successful_mappings}개의 격자 포인트가 PostGIS 데이터를 매핑하여 업데이트되었습니다!")

def main():
    """
    PostgreSQL과 MySQL을 연결한 후 데이터 매핑을 수행합니다.
    """
    try:
        pg_conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT, database=PG_DBNAME, user=PG_USER, password=PG_PASSWORD
        )
        print("PostgreSQL에 성공적으로 연결됨.")
    except PGError as e:
        print("PostgreSQL 연결 오류:", e)
        return

    try:
        mysql_conn = mysql.connector.connect(
            host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER,
            password=MYSQL_PASSWORD, database=MYSQL_DBNAME, autocommit=False
        )
        print("MySQL에 성공적으로 연결됨.")
    except MySQLError as e:
        print("MySQL 연결 오류:", e)
        pg_conn.close()
        return

    # MySQL의 korea_grid 테이블에 저장된 격자 좌표를 기준으로 PostGIS 데이터를 업데이트
    update_mysql_grid_with_pg_data(pg_conn, mysql_conn)

    # 연결 종료
    pg_conn.close()
    mysql_conn.close()
    print("데이터 동기화 작업 완료.")

if __name__ == "__main__":
    main()
