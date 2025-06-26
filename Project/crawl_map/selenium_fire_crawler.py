import time
import json
import sqlite3
import os
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Optional
import requests
from PIL import Image # Pillow 라이브러리에서 Image 모듈 가져오기

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# 기존 import 구문들 아래에 추가하세요.
from apscheduler.schedulers.background import BackgroundScheduler
import atexit

# 기존 import 구문들 아래에 추가하세요.
import io

import math

from selenium.webdriver.support import expected_conditions



class SeleniumFireCrawler:

    # 기존 __init__ 함수를 아래 코드로 교체
    def __init__(self, project_root):
        self.base_url = "https://fd.forest.go.kr/ffas/"
        self.project_root = project_root
        self.crawl_dir = os.path.join(self.project_root, "crawl_map")
        self.shared_data_dir = os.path.join(self.project_root, "shared_data")
        
        self.driver = None
    

    def setup_driver(self):
        """Chrome 드라이버 설정"""
        chrome_options = Options()
        # chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        chrome_options.add_argument('--enable-logging')
        chrome_options.add_argument('--log-level=0')
        
        driver_path = r"C:\Users\User\Desktop\chromedriver-win64\chromedriver.exe" 
        service = Service(executable_path=driver_path)
        
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.implicitly_wait(10)
        
        return self.driver
    

        
    # 기존 run_crawler 함수를 아래 코드로 교체하세요.
    def run_crawler(self):
        """메인 크롤링 실행"""
        try:
            self.setup_driver()
            print("산불 정보 사이트 접속 중...")
            self.driver.get(self.base_url)
            
            time.sleep(10)
            
            # 파일 경로 대신 이미지 데이터를 직접 받습니다.
            map_screenshot_data = self.get_map_screenshot_data()
            
            if map_screenshot_data:
                # 이미지 데이터를 분석 함수에 전달합니다.
                markers = self.extract_map_markers(map_screenshot_data)
                self.save_marker_data(markers)
                
                # 더 이상 파일 삭제 로직이 필요 없습니다.
                
        except Exception as e:
            print(f"크롤링 중 오류 발생: {e}")
        finally:
            if self.driver:
                self.driver.quit()


    # 기존 capture_screenshot 함수를 아래 코드로 교체하세요.
    def get_map_screenshot_data(self):
        """지도 스크린샷을 파일이 아닌 메모리 데이터로 가져옵니다."""
        try:
            wait = WebDriverWait(self.driver, 15)
            canvas_element = wait.until(
                expected_conditions.presence_of_element_located((By.CSS_SELECTOR, "canvas.ol-unselectable"))
            )
            # 스크린샷을 파일로 저장하는 대신, PNG 이미지 데이터를 직접 반환합니다.
            screenshot_data = canvas_element.screenshot_as_png
            print("지도 이미지 데이터 캡처 완료.")
            return screenshot_data
        except Exception as e:
            print(f"스크린샷 데이터 캡처 실패: {e}")
            return None
        

        

    def extract_map_markers(self, map_screenshot_data):
        """지도 이미지에서 마커의 위치와 색상을 추출 (클러스터링 필터 적용)"""
        print("지도 이미지에서 마커 정보 추출 중...")
        if not map_screenshot_data:
            print("지도 스크린샷 데이터가 없어 마커 추출을 건너뜁니다.")
            return []

        try:
            img = Image.open(io.BytesIO(map_screenshot_data))
            pixels = img.load()
            width, height = img.size
            
            # 허용 오차는 약간 넉넉하게 다시 설정합니다.
            color_definitions = {
                'red': ((12, 88, 191), 20),
                'green': ((16, 140, 0), 5),
                'gray': ((195, 195, 195), 5)
            }

            map_geo_bounds = {
                'top_left': {'lat': 38.7, 'lon': 124.5},
                'bottom_right': {'lat': 33.0, 'lon': 131.0}
            }
            
            found_markers = []
            min_dist_sq = 50**2  # 같은 마커를 중복해서 찾지 않기 위한 최소 거리(픽셀)

            # 이미 검증한 픽셀은 건너뛰기 위한 집합
            verified_pixels = set()

            for x in range(0, width, 5):
                for y in range(0, height, 5):
                    if (x, y) in verified_pixels:
                        continue

                    r, g, b = pixels[x, y][:3]
                    for color_name, (target_rgb, tolerance) in color_definitions.items():
                        if abs(r - target_rgb[0]) < tolerance and abs(g - target_rgb[1]) < tolerance and abs(b - target_rgb[2]) < tolerance:
                            
                            # --- [새로운 클러스터 검증 로직] ---
                            cluster_size = 9  # 주변 9x9 픽셀 영역을 확인
                            cluster_threshold = 10 # 그 중 최소 10개 이상이 비슷한 색이어야 함
                            match_count = 0
                            
                            for i in range(-cluster_size // 2, cluster_size // 2 + 1):
                                for j in range(-cluster_size // 2, cluster_size // 2 + 1):
                                    check_x, check_y = x + i, y + j
                                    if 0 <= check_x < width and 0 <= check_y < height:
                                        cr, cg, cb = pixels[check_x, check_y][:3]
                                        if abs(cr - target_rgb[0]) < tolerance and abs(cg - target_rgb[1]) < tolerance and abs(cb - target_rgb[2]) < tolerance:
                                            match_count += 1
                            
                            # 클러스터를 형성하지 못하면 노이즈로 판단하고 건너뜀
                            if match_count < cluster_threshold:
                                continue
                            # --- [검증 로직 끝] ---

                            is_too_close = any(((fm['px'] - x)**2 + (fm['py'] - y)**2) < min_dist_sq for fm in found_markers)
                            if is_too_close:
                                continue
                            
                            lon_range = map_geo_bounds['bottom_right']['lon'] - map_geo_bounds['top_left']['lon']
                            lat_range = map_geo_bounds['top_left']['lat'] - map_geo_bounds['bottom_right']['lat']
                            lon = map_geo_bounds['top_left']['lon'] + (x / width) * lon_range
                            lat = map_geo_bounds['top_left']['lat'] - (y / height) * lat_range

                            found_markers.append({'lat': round(lat, 6), 'lon': round(lon, 6), 'color': color_name, 'px': x, 'py': y})
                            
                            # 찾은 클러스터 주변은 더 이상 탐색하지 않도록 기록
                            for i in range(-cluster_size // 2, cluster_size // 2 + 1):
                                for j in range(-cluster_size // 2, cluster_size // 2 + 1):
                                    verified_pixels.add((x + i, y + j))

                            break
            
            for marker in found_markers:
                del marker['px'], marker['py']
            
            print(f"마커 {len(found_markers)}개 추출 완료.")
            return found_markers

        except Exception as e:
            print(f"마커 추출 중 오류 발생: {e}")
            return []





    def save_marker_data(self, markers):
        """추출된 마커 데이터를 JSON 파일로 저장"""
        try:
            json_path = os.path.join(self.shared_data_dir, "fire_markers.json")
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(markers, f, ensure_ascii=False, indent=2)
            print(f"마커 데이터 저장 완료: {json_path}")
        except Exception as e:
            print(f"마커 데이터 저장 실패: {e}")






# 기존 def main(): 부분을 아래와 같이 이름만 변경합니다.
def run_crawl_job():
    """메인 크롤링 실행 함수 (스케줄러에 의해 호출됨)"""
    print(f"\n[{datetime.now()}] === 크롤링 작업 시작 ===")
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    crawler = SeleniumFireCrawler(project_root)
    crawler.run_crawler()
    print(f"[{datetime.now()}] === 크롤링 작업 종료 ===")


# 기존 if __name__ == "__main__": 부분을 아래 코드로 교체하세요.
if __name__ == "__main__":
    # 1. 백그라운드 스케줄러 생성
    scheduler = BackgroundScheduler()

    # 2. 스케줄러에 작업 추가: 10분마다 run_crawl_job 함수를 실행
    #    처음에는 즉시 한 번 실행하고, 그 후 30분 간격으로 실행합니다.
    scheduler.add_job(run_crawl_job, 'interval', minutes=30, id="fire_crawl_job")
    
    # 3. 프로그램이 종료될 때 스케줄러가 안전하게 종료되도록 등록
    atexit.register(lambda: scheduler.shutdown())

    # 4. 스케줄러 시작
    scheduler.start()

    print("=== 실시간 산불 마커 크롤러가 시작되었습니다. (30분 간격 자동 실행) ===")
    print("이 창을 닫지 마세요. 닫으면 자동 실행이 멈춥니다.")
    print("Ctrl+C를 눌러 프로그램을 종료할 수 있습니다.")

    # 5. 스케줄러가 백그라운드에서 계속 실행되도록 메인 스레드는 대기 상태로 둡니다.
    try:
        # 첫 크롤링을 즉시 실행
        run_crawl_job() 
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        pass
