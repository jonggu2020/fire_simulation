import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map, View, Feature } from 'ol';
import { Point } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle as CircleStyle, Fill } from 'ol/style';
import 'ol/ol.css';
import { fromLonLat } from 'ol/proj';
import { VWORLD_XYZ_URL, fireSpreadColors } from './mapConfig';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// 목록 UI 컴포넌트
const HistoricalFireList = ({ fires, onFireClick, selectedFireId }) => {
    // ... (UI 컴포넌트 코드는 이전과 동일)
};

const HistoricalMap = () => {
    const [historicalFireList, setHistoricalFireList] = useState([]);
    const [selectedFire, setSelectedFire] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const mapContainerRef = useRef(null);
    const olMapRef = useRef(null);
    const baseGridSourceRef = useRef(null); // 1단계: 전체 격자 레이어
    const fireAnimationSourceRef = useRef(null); // 2, 3단계: 산불 애니메이션 레이어

    const [simulationTime, setSimulationTime] = useState(0);
    const [maxSimTime, setMaxSimTime] = useState(3600);
    const [isPlaying, setIsPlaying] = useState(false);
    const simulationTimeRef = useRef(simulationTime);
    const animationFrameId = useRef(null);
    const lastFrameTime = useRef(null);
    const navigate = useNavigate();

    // 1단계: 컴포넌트가 로드될 때 전체 격자 데이터와 산불 목록을 가져옵니다.
    useEffect(() => {
        const fetchData = async () => {
            try {
                // MySQL의 전체 격자 데이터 로드
                const gridResponse = await axios.get('/api/mapped-grid-data');
                const geoJson = { type: 'FeatureCollection', features: gridResponse.data.features };
                const mapProjection = olMapRef.current.getView().getProjection();
                const gridFeatures = new GeoJSON().readFeatures(geoJson, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: mapProjection
                });
                baseGridSourceRef.current.addFeatures(gridFeatures);

                // CSV의 산불 목록 로드
                const listResponse = await axios.get('/api/historical-fires');
                setHistoricalFireList(listResponse.data);

            } catch (error) {
                console.error("초기 데이터 로딩 실패:", error);
            }
        };
        
        if (olMapRef.current) {
            fetchData();
        }
    }, []); // 지도 초기화 후 한번만 실행

    // 3단계: 애니메이션 로직
    useEffect(() => {
        const animationLoop = (timestamp) => {
            if (!lastFrameTime.current) lastFrameTime.current = timestamp;
            const elapsedRealTime = timestamp - lastFrameTime.current;
            const simulationSpeedMultiplier = 180;
            const elapsedSimTime = (elapsedRealTime / 1000) * simulationSpeedMultiplier;
            const newSimTime = Math.min(simulationTimeRef.current + elapsedSimTime, maxSimTime);
            setSimulationTime(newSimTime);
            lastFrameTime.current = timestamp;
            if (newSimTime < maxSimTime) {
                animationFrameId.current = requestAnimationFrame(animationLoop);
            } else {
                setIsPlaying(false);
            }
        };
        if (isPlaying) {
            lastFrameTime.current = null;
            animationFrameId.current = requestAnimationFrame(animationLoop);
        }
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [isPlaying, maxSimTime]);

    // 지도 초기화
    useEffect(() => {
        if (!mapContainerRef.current || olMapRef.current) return;
        
        baseGridSourceRef.current = new VectorSource();
        fireAnimationSourceRef.current = new VectorSource();

        const map = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({ source: new XYZ({ url: VWORLD_XYZ_URL }) }),
                // 1단계: 전체 격자 레이어 (기본 스타일)
                new VectorLayer({
                    source: baseGridSourceRef.current,
                    style: new Style({ image: new CircleStyle({ radius: 1.5, fill: new Fill({ color: 'rgba(0, 100, 0, 0.3)' }) }) }),
                }),
                // 2단계: 산불 애니메이션 레이어 (동적 스타일)
                new VectorLayer({
                    source: fireAnimationSourceRef.current,
                    style: (feature) => { // 3단계: 동적 스타일링
                        const { ignitionTime, burnoutTime } = feature.getProperties();
                        const currentSimTime = simulationTimeRef.current;
                        if (currentSimTime >= burnoutTime) {
                            return new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: fireSpreadColors.burned_out }) }) });
                        }
                        if (currentSimTime >= ignitionTime) {
                            return new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: fireSpreadColors.burning }) }) });
                        }
                        return null; // 아직 발화 전인 포인트는 숨김
                    },
                    zIndex: 2
                })
            ],
            view: new View({ center: fromLonLat([127.7669, 35.9078]), zoom: 7 }),
        });
        olMapRef.current = map;

        return () => { if (olMapRef.current) { olMapRef.current.dispose(); olMapRef.current = null; }};
    }, []);

    // 시뮬레이션 시간 변경 시 애니메이션 레이어만 다시 그리도록 요청
    useEffect(() => {
        if (fireAnimationSourceRef.current) {
            fireAnimationSourceRef.current.changed();
        }
    }, [simulationTime]);

    // 2단계: 사용자가 목록에서 산불을 선택했을 때의 처리
    const handleFireClick = async (fireItem) => {
        if (!fireItem || !fireItem.id) return;
        if (selectedFire && selectedFire.id === fireItem.id) return;

        setIsLoading(true);
        resetAnimation();
        setSelectedFire(fireItem);

        try {
            const response = await axios.get(`/api/historical-fires/${fireItem.id}`);
            const fireData = response.data;

            if (fireData && fireData.features) {
                setMaxSimTime(fireData.simulationEndTime || 3600);
                const mapProjection = olMapRef.current.getView().getProjection();
                const fireFeatures = new GeoJSON().readFeatures({ type: 'FeatureCollection', features: fireData.features }, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: mapProjection
                });
                fireAnimationSourceRef.current.addFeatures(fireFeatures);
                
                if (fireFeatures.length > 0) {
                    const extent = fireAnimationSourceRef.current.getExtent();
                    olMapRef.current.getView().fit(extent, { padding: [100, 100, 100, 350], duration: 1000 });
                }
                setIsPlaying(true);
            }
        } catch (error) {
            console.error("과거 산불 상세 데이터 로딩 실패:", error);
            alert("데이터를 불러오는 중 오류가 발생했습니다.");
            setSelectedFire(null);
        } finally {
            setIsLoading(false);
        }
    };

    // ... (formatTime, handleSliderChange, handleTogglePlay 함수는 기존과 동일)
    const formatTime = (seconds) => { /* ... */ };
    const handleSliderChange = (newTime) => { /* ... */ };
    const handleTogglePlay = () => { /* ... */ };
    
    // 애니메이션 상태만 초기화하는 함수
    const resetAnimation = () => {
        setIsPlaying(false);
        fireAnimationSourceRef.current?.clear();
        setSimulationTime(0);
        setMaxSimTime(3600);
    };
    
    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
            
            <HistoricalFireList 
                fires={historicalFireList}
                onFireClick={handleFireClick}
                selectedFireId={selectedFire ? selectedFire.id : null}
            />

            <button 
                onClick={() => navigate('/map')} 
                style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1002, padding: '10px 15px', cursor: 'pointer' }}
            >
                예측 시뮬레이션으로 이동
            </button>
            
            {(isLoading || selectedFire) && (
                <div style={{
                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '15px', borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 1000, width: '80%', maxWidth: '900px'
                }}>
                    {isLoading ? (
                        <p style={{textAlign: 'center', margin: 0}}>데이터 로딩 중...</p>
                    ) : selectedFire && (
                        <>
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px'}}>
                                <b style={{fontSize: '14px', minWidth: '120px'}}>
                                    사례: {selectedFire.title}
                                </b>
                                <b style={{fontSize: '14px', flexGrow: 1, textAlign: 'center'}}>
                                    경과 시간: {formatTime(simulationTime)} / {formatTime(maxSimTime)}
                                </b>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                <input 
                                    type="range" min="0" max={maxSimTime} step="60"
                                    value={simulationTime} 
                                    onChange={(e) => handleSliderChange(Number(e.target.value))} 
                                    style={{ flexGrow: 1, cursor: 'pointer' }} 
                                />
                            </div>
                            <div style={{display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px'}}>
                                <button onClick={handleTogglePlay}>
                                    {isPlaying ? '일시정지' : '재생'}
                                </button>
                                <button onClick={() => handleSliderChange(maxSimTime)}>
                                    최종 결과
                                </button>
                                <button onClick={() => { resetAnimation(); setSelectedFire(null); }}>초기화</button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoricalMap;
