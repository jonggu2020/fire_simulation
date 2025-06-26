import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error as MySQLError

# .env 파일 로드
load_dotenv()

# MySQL 연결 정보 (변수명은 .env 파일과 동일하게 맞추세요)
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DBNAME = os.getenv("MYSQL_DBNAME")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))

def get_mysql_columns(mysql_conn, table_name):
    """
    MySQL의 해당 테이블의 컬럼 목록을 반환합니다.
    """
    columns = []
    try:
        cursor = mysql_conn.cursor()
        query = f"SHOW COLUMNS FROM {table_name};"
        cursor.execute(query)
        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()
    except MySQLError as e:
        print(f"테이블 {table_name}의 컬럼 조회 오류: {e}")
    return columns

def get_mapping_columns(column_list, prefixes=["imsangdo_", "soil_"]):
    """
    컬럼 목록에서 지정된 접두어(예: imsangdo_, soil_)로 시작하는 컬럼만 필터링하여 반환합니다.
    """
    mapping_columns = []
    for col in column_list:
        for prefix in prefixes:
            if col.startswith(prefix):
                mapping_columns.append(col)
                break
    return mapping_columns

def get_mapping_stats(mysql_conn):
    """
    MySQL의 korea_grid 테이블에서 전체 격자 포인트 개수, 
    매핑된 포인트(접두어 컬럼 중 하나라도 값이 채워진 포인트) 개수, 
    매핑되지 않은(비어있는) 포인트 개수를 반환합니다.
    """
    table_name = "korea_grid"
    try:
        cursor = mysql_conn.cursor()
        # 전체 격자 포인트 개수
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        total_count = cursor.fetchone()[0]

        # 테이블의 컬럼 목록 가져오기 및 접두어로 시작하는 컬럼 추출
        columns = get_mysql_columns(mysql_conn, table_name)
        mapping_columns = get_mapping_columns(columns)

        # 매핑된 행을 구하는 조건을 생성합니다.
        # (조건: 해당 접두어 컬럼들 중 하나라도 NOT NULL인 경우)
        conditions = " OR ".join([f"`{col}` IS NOT NULL" for col in mapping_columns])

        if conditions:
            query_mapped = f"SELECT COUNT(*) FROM {table_name} WHERE {conditions};"
        else:
            query_mapped = "SELECT 0;"  # 매핑 컬럼이 없을 경우

        cursor.execute(query_mapped)
        mapped_count = cursor.fetchone()[0]
        cursor.close()

        empty_count = total_count - mapped_count
        return total_count, mapped_count, empty_count
    except MySQLError as e:
        print("매핑 통계 조회 오류:", e)
        return None, None, None

def main():
    try:
        mysql_conn = mysql.connector.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DBNAME,
            autocommit=True
        )
        print("MySQL에 성공적으로 연결됨.")
    except MySQLError as e:
        print("MySQL 연결 오류:", e)
        return

    total, mapped, empty = get_mapping_stats(mysql_conn)
    if total is not None:
        print(f"총 격자 포인트 개수: {total}")
        print(f"매핑된 포인트 개수: {mapped}")
        print(f"비어있는(매핑되지 않은) 포인트 개수: {empty}")

    mysql_conn.close()

if __name__ == "__main__":
    main()
