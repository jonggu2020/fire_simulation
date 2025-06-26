import mysql.connector
from mysql.connector import Error

def create_connection(host_name, user_name, user_password, db_name):
    """
    MySQL에 연결을 시도하여 connection 객체를 반환합니다.
    """
    try:
        connection = mysql.connector.connect(
            host=host_name,
            user=user_name,
            password=user_password,
            database=db_name,
            autocommit=False  # 직접 commit을 관리
        )
        print("MySQL에 성공적으로 연결됨")
        return connection
    except Error as e:
        print(f"MySQL 연결 오류: {e}")
        return None

def create_table(connection):
    """
    기존 korea_grid 테이블이 존재하면 삭제하고, SRID 4326(POSITION POINT)를 사용하는 새 테이블을 생성합니다.
    """
    cursor = connection.cursor()
    try:
        cursor.execute("DROP TABLE IF EXISTS korea_grid;")
        create_table_query = """
        CREATE TABLE korea_grid (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lat DOUBLE,
            lng DOUBLE,
            location POINT NOT NULL SRID 4326,
            SPATIAL INDEX(location)
        ) ENGINE=InnoDB;
        """
        cursor.execute(create_table_query)
        connection.commit()
        print("테이블 korea_grid 생성 완료")
    except Error as e:
        print("테이블 생성 오류:", e)
        connection.rollback()
    finally:
        cursor.close()

def insert_grid_points(connection):
    """
    지정된 범위 내(예시: 위도 33.0°~39.0°, 경도 124.0°~132.0°)의 격자 좌표를 생성하고,
    각 포인트를 SRID 4326에 맞는 POINT 자료형 형태로 korea_grid 테이블에 삽입합니다.
    
    ※ 주의: MySQL의 ST_GeomFromText가 좌표 순서를 첫 번째 값=위도, 두 번째 값=경도로 체크하는 이슈가 있어,
    WKT 문자열 생성 시 {lat}와 {lng}의 순서를 반대로 사용합니다.
    """
    start_lat = 33.0
    end_lat = 39.0
    start_lng = 124.0
    end_lng = 132.0
    step = 0.01  # 격자 해상도 (도 단위)

    cursor = connection.cursor()
    insert_query = """
        INSERT INTO korea_grid (lat, lng, location) 
        VALUES (%s, %s, ST_GeomFromText(%s, 4326))
    """
    values = []
    count = 0

    lat = start_lat
    while lat <= end_lat:
        lng = start_lng
        while lng <= end_lng:
            # 원래는 "POINT({lng} {lat})"가 표준이지만, MySQL의 좌표 검증 이슈로 인해 아래와 같이 작성합니다.
            point_wkt = f"POINT({lat} {lng})"
            values.append((lat, lng, point_wkt))
            count += 1
            lng += step
        lat += step

    print(f"{count}개의 격자 포인트를 삽입합니다.")
    try:
        cursor.executemany(insert_query, values)
        connection.commit()
        print("격자 포인트 삽입 완료")
    except Error as e:
        print("격자 포인트 삽입 오류:", e)
        connection.rollback()
    finally:
        cursor.close()

def main():
    # MySQL 접속 정보 (환경에 맞게 수정)
    host = "localhost"          # 예: "localhost" 또는 MySQL 서버 주소
    user = "root"      # 본인 MySQL 사용자 이름
    password = "jonggu2020"  # 본인 MySQL 비밀번호
    database = "fire"  # 대상 데이터베이스 이름

    connection = create_connection(host, user, password, database)
    if connection is not None:
        create_table(connection)
        insert_grid_points(connection)
        connection.close()
        print("MySQL 연결 종료")

if __name__ == "__main__":
    main()
