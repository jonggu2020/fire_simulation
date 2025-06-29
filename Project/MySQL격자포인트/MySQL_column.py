import os
from dotenv import load_dotenv
import mysql.connector
import psycopg2
from mysql.connector import Error as MySQLError
from psycopg2 import Error as PGError

# .env 파일 로드.
load_dotenv()

# PostgreSQL 연결 정보
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")
PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT")
PG_DBNAME = os.getenv("PG_DBNAME")
PG_SCHEMA = os.getenv("PG_SCHEMA")  # 보통 'public' 입니다.

# MySQL 연결 정보
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DBNAME = os.getenv("MYSQL_DBNAME")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))

def get_pg_columns(pg_conn, pg_table):
    """
    PostgreSQL public 스키마의 지정 테이블에 대해 칼럼명과 데이터형 정보를 반환합니다.
    """
    columns = []
    try:
        cur = pg_conn.cursor()
        query = """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s;
        """
        cur.execute(query, (PG_SCHEMA, pg_table))
        columns = cur.fetchall()
        cur.close()
    except PGError as e:
        print(f"테이블 {pg_table}의 칼럼 정보를 가져오는 중 오류 발생: {e}")
    return columns

def pg_to_mysql_type(pg_type):
    """
    PostgreSQL 데이터형을 MySQL 데이터형으로 매핑합니다.
    필요에 따라 추가 혹은 수정하세요.
    """
    mapping = {
        "character varying": "VARCHAR(255)",
        "text": "TEXT",
        "integer": "INT",
        "bigint": "BIGINT",
        "smallint": "SMALLINT",
        "double precision": "DOUBLE",
        "numeric": "DECIMAL(10,2)",
        "boolean": "BOOLEAN",
        "date": "DATE",
        "timestamp without time zone": "DATETIME",
        "timestamp with time zone": "DATETIME",
    }
    return mapping.get(pg_type, "TEXT")

def get_existing_columns_mysql(mysql_conn, table_name, db_name):
    """
    MySQL의 information_schema를 조회하여 지정 테이블에 이미 존재하는 칼럼명을 집합으로 반환합니다.
    """
    existing_columns = set()
    try:
        cursor = mysql_conn.cursor()
        query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s;
        """
        cursor.execute(query, (db_name, table_name))
        for row in cursor.fetchall():
            existing_columns.add(row[0])
        cursor.close()
    except MySQLError as e:
        print(f"MySQL에서 {table_name}의 칼럼 정보를 가져오는 중 오류 발생: {e}")
    return existing_columns

def add_column_to_mysql(mysql_conn, table_name, col_name, mysql_type):
    """
    MySQL의 ALTER TABLE 명령으로 지정 테이블에 하나의 칼럼을 추가합니다.
    """
    alter_query = f"ALTER TABLE {table_name} ADD COLUMN `{col_name}` {mysql_type};"
    try:
        cursor = mysql_conn.cursor()
        cursor.execute(alter_query)
        mysql_conn.commit()
        print(f"칼럼 `{col_name}` ({mysql_type}) 이(가) {table_name} 테이블에 추가되었습니다.")
        cursor.close()
    except MySQLError as e:
        print(f"칼럼 `{col_name}` 추가 중 오류 발생: {e}")
        mysql_conn.rollback()

def main():
    # PostgreSQL 연결
    try:
        pg_conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            database=PG_DBNAME,
            user=PG_USER,
            password=PG_PASSWORD
        )
        print("PostgreSQL에 성공적으로 연결됨")
    except PGError as e:
        print(f"PostgreSQL 연결 오류: {e}")
        return

    # MySQL 연결
    try:
        mysql_conn = mysql.connector.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DBNAME,
            autocommit=False
        )
        print("MySQL에 성공적으로 연결됨")
    except MySQLError as e:
        print(f"MySQL 연결 오류: {e}")
        pg_conn.close()
        return

    # PostgreSQL public 스키마의 대상 테이블 목록과 각각에 적용할 접두사 설정
    # 전자는 imsangdo, 후자는 soil
    pg_tables = ["busan_imsangdo", "busan_soil"]  # 실제 PostgreSQL 테이블명으로 수정하세요.
    prefixes = ["imsangdo", "soil"]

    # MySQL korea_grid 테이블에 이미 존재하는 칼럼 확인
    mysql_table = "korea_grid"
    existing_columns = get_existing_columns_mysql(mysql_conn, mysql_table, MYSQL_DBNAME)

    # PostgreSQL 각 테이블의 칼럼 정보를 읽고, 접두사(imsangdo 혹은 soil)를 붙여 MySQL 테이블에 추가
    for pg_table, prefix in zip(pg_tables, prefixes):
        cols = get_pg_columns(pg_conn, pg_table)
        for col_name, data_type in cols:
            new_col_name = f"{prefix}_{col_name}"
            if new_col_name in existing_columns:
                print(f"칼럼 `{new_col_name}` 은(는) 이미 존재하므로 건너뜁니다.")
                continue
            mysql_data_type = pg_to_mysql_type(data_type)
            add_column_to_mysql(mysql_conn, mysql_table, new_col_name, mysql_data_type)
    
    # 모든 연결 종료
    pg_conn.close()
    mysql_conn.close()
    print("모든 작업 완료.")

if __name__ == "__main__":
    main()
