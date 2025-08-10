// src/components/HistoricalMap.js 파일 최상단에 이 내용만 있도록 해주세요.

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';
import { VWORLD_XYZ_URL } from './mapConfig';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import hull from 'hull.js';
import Polygon from 'ol/geom/Polygon';
import Feature from 'ol/Feature';

// ✅ [개발용 수정] OpenLayers 상호작용 모듈 추가
import { Select } from 'ol/interaction';
import { click } from 'ol/events/condition';


// HistoricalFireList 컴포넌트
const HistoricalFireList = ({ fires, onFireClick, selectedFireId, onSort, sortConfig }) => {
    // 시간 포맷팅 함수
    const formatTime = (seconds) => {
        if (seconds < 3600) {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = Math.floor(seconds % 60).toString().padStart(2, '0');
            return `${m}분 ${s}초`;
        }
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        return `${h}시간 ${m}분`;
    };

    // 스타일 객체 정의
    const listStyle = {
        position: 'absolute', top: '80px', left: '20px', zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '10px 15px',
        borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '280px', minHeight: '100px',
        maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', display: 'flex', flexDirection: 'column'
    };

    const buttonStyle = {
        padding: '4px 8px', margin: '0 4px', border: '1px solid #ccc',
        borderRadius: '4px', background: '#f0f0f0', cursor: 'pointer'
    };
    
    // 정렬 방향 표시(▲/▼)를 위한 헬퍼 함수 정의
    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'desc' ? ' ▼' : ' ▲';
        }
        return '';
    };

    return (
        <div style={listStyle}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>과거 산불 사례 목록</h4>
            
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', marginRight: '8px' }}>정렬:</span>
                <button style={buttonStyle} onClick={() => onSort('size')}>
                    규모{getSortIndicator('size')}
                </button>
                <button style={buttonStyle} onClick={() => onSort('time')}>
                    시간{getSortIndicator('time')}
                </button>
            </div>

            {fires.length === 0 ? (
                <p>데이터를 불러오는 중입니다...</p>
            ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, flexGrow: 1, overflowY: 'auto' }}>
                    {fires.map(fire => (
                        <li 
                            key={fire.id} 
                            onClick={() => onFireClick(fire)}
                            style={{ 
                                padding: '8px 5px', 
                                cursor: 'pointer', 
                                borderBottom: '1px solid #eee', 
                                backgroundColor: selectedFireId === fire.id ? '#e0f7fa' : 'transparent',
                                fontWeight: selectedFireId === fire.id ? 'bold' : 'normal'
                            }}
                        >
                            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                                {fire.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#555' }}>
                                <span>
                                    규모: {fire.simulationData.features?.length || 0} 지점
                                </span>
                                <span style={{ marginLeft: '10px' }}>
                                    시간: {formatTime(fire.simulationData.simulationEndTime || 0)}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const HistoricalMap = () => {
    const [historicalFireList, setHistoricalFireList] = useState([]);
    const [selectedFire, setSelectedFire] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'default', direction: 'desc' });

    const mapContainerRef = useRef(null);
    const olMapRef = useRef(null);
    const gridLayerRef = useRef(null);
    const hullLayerRef = useRef(null);
    const selectedFireDataRef = useRef(null);

    // ✅ [개발용 수정] 상호작용 및 선택/제외된 ID를 관리할 state와 ref 추가
    const selectInteractionRef = useRef(null);
    const [selectedGridId, setSelectedGridId] = useState(null);
    const [excludedGridIds, setExcludedGridIds] = useState(() => new Set());
    
    const [burningGridIds, setBurningGridIds] = useState(() => new Set());
    const hullStyle = useMemo(() => new Style({
        stroke: new Stroke({ color: 'rgba(220, 53, 69, 0.8)', width: 2 }),
        fill: new Fill({ color: 'rgba(255, 120, 100, 0.3)' }),
    }), []);

    const [simulationTime, setSimulationTime] = useState(0);
    const [maxSimTime, setMaxSimTime] = useState(3600);
    const [isPlaying, setIsPlaying] = useState(false);
    const animationFrameId = useRef(null);
    const lastFrameTime = useRef(null);
    const navigate = useNavigate();

    const sortedFires = useMemo(() => {
        const sortableFires = [...historicalFireList];
        if (sortConfig.key !== 'default') {
            sortableFires.sort((a, b) => {
                const aData = a.simulationData;
                const bData = b.simulationData;
                let aValue = 0;
                let bValue = 0;
                if (sortConfig.key === 'size') {
                    aValue = aData.features?.length || 0;
                    bValue = bData.features?.length || 0;
                } else if (sortConfig.key === 'time') {
                    aValue = aData.simulationEndTime || 0;
                    bValue = bData.simulationEndTime || 0;
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableFires;
    }, [historicalFireList, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(currentConfig => ({
            key,
            direction: currentConfig.key === key && currentConfig.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // ✅ [개발용 수정] 제외/선택된 격자에 대한 스타일링 로직 추가
    const gridStyleFunction = useCallback((feature) => {
        const gridId = feature.get('id');

        // 1. 제외된 격자는 회색으로 최우선 표시
        if (excludedGridIds.has(gridId)) {
            return new Style({
                image: new CircleStyle({
                    radius: 4,
                    fill: new Fill({ color: 'rgba(128, 128, 128, 0.7)' }),
                    stroke: new Stroke({ color: '#333', width: 1 }),
                })
            });
        }
        
        // 2. 현재 선택된 격자는 파란색으로 강조
        if (gridId === selectedGridId) {
            return new Style({
                image: new CircleStyle({
                    radius: 6,
                    fill: new Fill({ color: 'rgba(0, 123, 255, 0.8)' }),
                    stroke: new Stroke({ color: 'white', width: 2 }),
                })
            });
        }

        // 3. 불타는 격자는 기존 스타일 유지
        if (burningGridIds.has(gridId)) {
            return new Style({
                image: new CircleStyle({ radius: 3, fill: new Fill({ color: 'rgba(255, 0, 0, 0.8)' }) })
            });
        }
        
        const isLine = feature.getGeometry().getType() === 'LineString';
        if (isLine) {
            return new Style({
                stroke: new Stroke({ color: 'rgba(255, 255, 255, 1)', width: 2, lineDash: [5, 5] })
            });
        }

    }, [burningGridIds, selectedGridId, excludedGridIds]); // 의존성 배열 업데이트

    useEffect(() => {
        const gridSource = new VectorSource();
        const gridLayer = new VectorLayer({ source: gridSource });
        gridLayerRef.current = gridLayer;

        const hullSource = new VectorSource();
        const hullLayer = new VectorLayer({
            source: hullSource,
            style: hullStyle,
        });
        hullLayerRef.current = hullLayer;


        const map = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({ source: new XYZ({ url: VWORLD_XYZ_URL }) }),
                hullLayer,
                gridLayer,
            ],
            view: new View({
                center: [127.7669, 35.9078],
                zoom: 7,
                projection: 'EPSG:4326',
            }),
        });
        olMapRef.current = map;

        // ✅ [개발용 수정] 클릭으로 격자를 선택하는 Select 상호작용 추가
        const selectInteraction = new Select({
            condition: click,
            layers: [gridLayer], // gridLayer에만 상호작용 적용
            style: null, // 스타일은 gridStyleFunction에서 동적으로 처리
        });

        selectInteraction.on('select', (event) => {
            if (event.selected.length > 0) {
                const selectedFeature = event.selected[0];
                // 제외된 피처는 다시 선택할 수 없도록 처리
                if (!excludedGridIds.has(selectedFeature.get('id'))) {
                    setSelectedGridId(selectedFeature.get('id'));
                } else {
                    // 선택을 해제하여 제외된 항목이 파랗게 강조되는 것을 방지
                     selectInteraction.getFeatures().clear();
                     setSelectedGridId(null);
                }
            } else {
                setSelectedGridId(null); // 선택 해제
            }
        });

        map.addInteraction(selectInteraction);
        selectInteractionRef.current = selectInteraction;

        const fetchData = async () => {
            try {
                const gridResponse = await axios.get('/api/mapped-grid-data');
                const features = new GeoJSON().readFeatures(gridResponse.data);
                gridSource.addFeatures(features);
                const listResponse = await axios.get('/api/historical-fires');
                setHistoricalFireList(listResponse.data);
            } catch (error) {
                console.error("초기 데이터 로딩 실패:", error);
            }
        };
        fetchData();

        return () => { if (olMapRef.current) { olMapRef.current.dispose(); olMapRef.current = null; }};
    }, [hullStyle, excludedGridIds]); // 의존성 배열 업데이트

    useEffect(() => {
        if (gridLayerRef.current) {
            gridLayerRef.current.setStyle(gridStyleFunction);
        }
    }, [gridStyleFunction]);

    // ✅ [개발용 수정] 제외된 ID를 필터링하는 로직 추가
    useEffect(() => {
        if (!selectedFireDataRef.current || !gridLayerRef.current) return;
    
        const { features } = selectedFireDataRef.current;
        const newBurningIds = new Set();
        
        for (const feature of features) {
            // 제외된 ID는 계산에서 건너뜀
            if (excludedGridIds.has(feature.properties.id)) {
                continue;
            }

            if (feature.properties.ignitionTime <= simulationTime) {
                newBurningIds.add(feature.properties.id);
            }
        }
        
        setBurningGridIds(newBurningIds);
    
        const hullSource = hullLayerRef.current?.getSource();
        if (!hullSource) return;
    
        hullSource.clear();
    
        if (newBurningIds.size > 2) {
            const gridSource = gridLayerRef.current.getSource();
            const burningCoordinates = [];
    
            gridSource.forEachFeature(feature => {
                if (newBurningIds.has(feature.get('id'))) {
                    burningCoordinates.push(feature.getGeometry().getCoordinates());
                }
            });
    
            if (burningCoordinates.length > 2) {
                const hullPoints = hull(burningCoordinates, 80);
                const hullPolygon = new Polygon([hullPoints]);
                const hullFeature = new Feature({ geometry: hullPolygon });
                hullSource.addFeature(hullFeature);
            }
        }
    }, [simulationTime, excludedGridIds]); // 의존성 배열 업데이트


    useEffect(() => {
        if (!isPlaying) {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            return;
        }

        const animationLoop = (timestamp) => {
            if (!lastFrameTime.current) lastFrameTime.current = timestamp;
            const elapsedRealTime = timestamp - lastFrameTime.current;
            const simulationSpeedMultiplier = 180;
            const elapsedSimTime = (elapsedRealTime / 1000) * simulationSpeedMultiplier;
            
            setSimulationTime(prevTime => {
                const newTime = prevTime + elapsedSimTime;
                if (newTime >= maxSimTime) {
                    setIsPlaying(false);
                    return maxSimTime;
                }
                return newTime;
            });
            
            lastFrameTime.current = timestamp;
            animationFrameId.current = requestAnimationFrame(animationLoop);
        };

        lastFrameTime.current = null;
        animationFrameId.current = requestAnimationFrame(animationLoop);

        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [isPlaying, maxSimTime]);

    const handleFireClick = (fireItem) => {
        if (!fireItem || !fireItem.simulationData) return;
        if (selectedFire && selectedFire.id === fireItem.id) return;

        setIsLoading(true);
        resetAnimation();
        setSelectedFire(fireItem);
        selectedFireDataRef.current = fireItem.simulationData;
        setMaxSimTime(fireItem.simulationData.simulationEndTime || 3600);
        setIsLoading(false);
        setIsPlaying(true);
    };

    // ✅ [개발용 수정] 제외 및 선택 상태를 초기화하는 로직 추가
    const resetAnimation = () => {
        setIsPlaying(false);
        setSimulationTime(0);
        setMaxSimTime(3600);
        setBurningGridIds(new Set());
        selectedFireDataRef.current = null;
        setSelectedFire(null);
        hullLayerRef.current?.getSource().clear();

        setExcludedGridIds(new Set());
        setSelectedGridId(null);
        if(selectInteractionRef.current) {
           selectInteractionRef.current.getFeatures().clear();
        }
    };
    
    const handleExcludeSelectedGrid = async () => {
        // 선택된 격자 ID가 있어야 함
        if (selectedGridId) {
            if (window.confirm(`정말로 이 격자(ID: ${selectedGridId})를 원본 데이터에서 영구적으로 제외하시겠습니까?\n이 작업은 서버 재시작 전까지 되돌릴 수 없습니다.`)) {
                try {
                    // 백엔드 API에 POST 요청 (gridId만 필요)
                    const response = await axios.post('/api/historical-fires/exclude-point', {
                        gridId: selectedGridId,
                    });
    
                    console.log(response.data.message);
                    alert('성공적으로 제외되었습니다. 변경사항을 완전히 적용하려면 서버를 재시작해야 할 수 있습니다.');
    
                    // 즉각적인 시각적 피드백을 위해 로컬 상태도 업데이트
                    setExcludedGridIds(prev => new Set(prev).add(selectedGridId));
                    setSelectedGridId(null);
                    selectInteractionRef.current.getFeatures().clear();
    
                } catch (error) {
                    console.error('격자 제외 처리 중 오류 발생:', error);
                    alert(`오류가 발생했습니다: ${error.response?.data?.message || error.message}`);
                }
            }
        }
    };

    const formatTime = (seconds) => {
        if (seconds < 3600) {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = Math.floor(seconds % 60).toString().padStart(2, '0');
            return `${m}분 ${s}초`;
        }
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        return `${h}시간 ${m}분`;
    };

    const handleSliderChange = (newTime) => {
        if (isPlaying) setIsPlaying(false);
        setSimulationTime(newTime);
    };

    const handleTogglePlay = () => {
        if (selectedFire) {
            setIsPlaying(prev => !prev);
        }
    };
    
    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
            
            <HistoricalFireList 
                fires={sortedFires}
                onFireClick={handleFireClick}
                selectedFireId={selectedFire ? selectedFire.id : null}
                onSort={handleSort}
                sortConfig={sortConfig}
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
                                <button onClick={resetAnimation}>초기화</button>
                                
                                {/* ✅ [개발용 수정] 격자 제외 버튼 UI 추가 */}
                                {selectedGridId && (
                                    <button 
                                        onClick={handleExcludeSelectedGrid}
                                        title="선택된 격자를 시뮬레이션에서 영구적으로 제외합니다 (초기화 전까지)."
                                        style={{ 
                                            padding: '0 10px',
                                            backgroundColor: '#dc3545', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        선택 격자 제외
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoricalMap;
