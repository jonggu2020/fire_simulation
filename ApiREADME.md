로그인
POST /api/auth/login
설명 : 웹에서 Firebase Admin SDK를 이용해서 로그인을 하고, 발급받은 Token을 서버로 보내 Token 유효성을 검증하는 방식입니다.
과정
1. 브라우저에서 전달한 Token의 유무를 확인합니다
2. Token 검증 메소드를 이용해서 해당 Token이 유효한지 검사합니다.
3. 유효하면 응답을 브라우저에 전송합니다 

회원가입
POST /api/auth/register
설명 : 사용자로부터 이메일, 비밀번호, 이름을 받아 신규 계정을 생성하는 API입니다.
과정
1. validator libarary를 이용해서 eamil 형식 등 검증합니다
2. Firebase Auth에 User의 계정을 생성합니다
3. User의 이름 등 추가 정보를 관리하기 위해 Firestore 내 users 컬렉션에 해당 유저의 UID를 기준으로 하여 프로필 정보를 저장합니다.

로그아웃
POST /api/auth/logout
설명 : 브라우저의 로그아웃을 확인할 수 있는 응답을 반환합니다.

미들웨어
verifyFirebaseToken
설명 : 인증이 필요한 API의 엔드포인트를 보호하기 위한 미들웨어 입니다.
과정
1. 헤더에서 인증 정보을 추출합니다
2. Token이 없거나 Bearer "Token" 형식이 아니면 오류 번호를 반환합니다.
3. Firestore auth의 verifyIdToken 메소드로 검증합니다
4. req.user 객체에 저장하여 라우터로 보냅니다

즐겨찾는 관측소 가져오기
GET /api/favorites
설명 : 로그인된 사용자의 모든 즐겨찾기 목록을 반환합니다.
과정
1. 로그인 된 User의 UID를 이용하여 Firestore에 저장된 Users 컬렉션에서 UID 문서의 favorites의 배열들을 가져옵니다
2. 배열이 존재하면 해당 배열을, 없으면 빈 배열을 반환합니다.

관측소를 즐겨찾기에 추가하기
POST /api/favorites
설명 : 사용자의 즐겨찾기 목록에 관측소를 추가합니다.
과정
1. request body에서 stationId, stationName, lat, lon 정보를 가져옵니다.
2. Firestore의 arrayUnion을 사용하여 favorites 배열에 새로운 관측소를 추가합니다.
arrayUnion : firestore의 문서 내에 존재하는 같은 요소들을 중복으로 추가되지 않도록 하는 매소드

즐겨찾기 삭제 
DELETE /api/favorites/:stationId
설명 : 사용자 즐겨찾기 목록에서 특정 관측소를 삭제합니다.
과정 
1. URL에 stationId를 가져와 firestore의 favorites 문서에서 stationId를 가진 배열을 삭제합니다

POST /api/history
설명 : 사용자의 시뮬레이션 내역을 저장합니다.
과정
1. front에서 이미지 변환을 위해 canvas를 이용해 그린후 blob으로 변환한뒤 historyapiService를 통해 api를 호출합니다.
2. firestore에 users 컬렉션/uId/history 문서에 추가합니다.
3. 성공 응답과 실패 응답을 반환합니다.

GET /api/history
설명 : 사용자의 시뮬레이션 내역을 가져옵니다.
과정
1. 사용자 인증 유무를 확인하고 request에서 user uid를 가져옵니다.
2. userId를 사용하여 Firestore의 users 컬렉션 userId에 있는 history 데이터를 조회합니다. createdAt 기준으로 최신순(desc)으로 정렬합니다.
3. 조회 결과가 없으면(내역이 비어있으면) 빈 배열 []을 응답합니다. 내역이 존재하면, 각 문서의 id와 데이터를 포함하는 객체 배열로 변환합니다.
4. 변환된 내역 배열을 JSON 형태로 응답합니다.
