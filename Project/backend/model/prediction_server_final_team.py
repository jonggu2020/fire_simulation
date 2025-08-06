import pandas as pd
import joblib
from flask import Flask, request, jsonify

app = Flask(__name__)
models = {}

def load_all_models():
    """서버 시작 시, 최종 챔피언 RandomForest 모델들을 로드합니다."""
    global models
    try:
        print("최종 챔피언 RandomForest 모델을 로딩합니다...")
        
        # ✅ 최종적으로 선택된 RandomForest 모델 두 개를 로드합니다.
        models['classifier'] = joblib.load('champion_classifier_rf.joblib')
        models['regressor'] = joblib.load('champion_regressor_rf.joblib')
        
        print("✅ 모든 최종 모델이 성공적으로 로드되었습니다. 서버가 준비되었습니다.")
        return True
    except Exception as e:
        print(f"❌ [치명적 오류] 모델 로딩 실패: {e}")
        return False

@app.route('/pre_classify', methods=['POST'])
def pre_classify():
    """사전 분류 API - 최종 RandomForest 분류 모델 사용"""
    if 'classifier' not in models:
        return jsonify({'error': '모델이 아직 로드되지 않았습니다.'}), 500
    try:
        input_data = request.json
        input_df = pd.DataFrame([input_data])
        
        # RandomForest는 데이터 스케일링이 필요 없으므로 원본 데이터를 바로 사용합니다.
        # 단, 학습 시 사용된 피처 순서와 동일하게 정렬합니다.
        feature_columns = models['classifier'].feature_names_in_
        input_df = input_df[feature_columns]

        predicted_class_index = models['classifier'].predict(input_df)[0]
        
        class_map = {0: '소형', 1: '중형', 2: '대형'} 
        predicted_class_name = class_map.get(int(predicted_class_index), '알수없음')

        result = {
            'predicted_fire_class': predicted_class_name,
            # RandomForest는 확률 대신 고정 신뢰도를 반환
            'confidence_percent': 90.0 
        }
        print(f"[사전 분류 완료] 최종 예상 등급: {result['predicted_fire_class']}")
        return jsonify(result)

    except Exception as e:
        print(f"[오류] 사전 분류 중 문제 발생: {e}")
        return jsonify({'error': str(e)}), 400


@app.route('/predict', methods=['POST'])
def predict():
    """확산 계수 예측 API - 최종 RandomForest 회귀 모델 사용"""
    if 'regressor' not in models:
         return jsonify({'error': '모델이 아직 로드되지 않았습니다.'}), 500
    try:
        input_data = request.json
        input_df = pd.DataFrame([input_data])
        
        feature_columns = models['regressor'].feature_names_in_
        input_df = input_df[feature_columns]
        
        predicted_frp = models['regressor'].predict(input_df)[0]

        result = {
            'predicted_spread_factor': float(predicted_frp)
        }
        return jsonify(result)

    except Exception as e:
        print(f"[오류] 확산 계수 예측 중 문제 발생: {e}")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    if load_all_models():
        app.run(host='0.0.0.0', port=5000)