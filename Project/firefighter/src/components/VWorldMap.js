import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map, View, Feature } from 'ol';
import { Point } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import TileWMS from 'ol/source/TileWMS';
import { Style, Circle as CircleStyle, Fill, Stroke, RegularShape } from 'ol/style';
import 'ol/ol.css';

import { transform } from 'ol/proj'; // 이 라인을 추가해주세요.


import {
    VWORLD_XYZ_URL,
    logicalLayersConfig as initialLogicalLayersConfig,
    fireSpreadColors,
    mountainMarkerStyle,
    hikingTrailStyle,
    fuelRatingColorMap
} from './mapConfig';
import Legend from './Legend';
import { mountainStationsData } from './mountainStations';
import { subscribeToStationWeather } from './weatherService';

const WeatherDisplay = ({ selectedStationInfo }) => {
    const [weatherInfo, setWeatherInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedStationInfo || !selectedStationInfo.obsid) {
            setWeatherInfo(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        const unsubscribe = subscribeToStationWeather(selectedStationInfo.obsid, (data, err) => {
            if (err) {
                setError('날씨 정보 수신 중 오류가 발생했습니다.');
                setWeatherInfo(null);
            } else if (data) {
                setWeatherInfo(data);
                setError(null);
            } else {
                setWeatherInfo(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [selectedStationInfo]);

    if (!selectedStationInfo) return null;

    const displayStyle = {
        position: 'absolute', top: '20px', right: '20px', zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '15px',
        borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '280px', fontSize: '13px'
    };

    return (
        <div style={displayStyle}>
            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
                {selectedStationInfo.name} 기상 정보
            </h4>
            {isLoading && <p>로딩 중...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {!isLoading && !error && !weatherInfo && <p>해당 관측소의 날씨 정보가 없습니다.</p>}
            {weatherInfo && (
                <div>
                    <p><strong>관측 시간:</strong> {weatherInfo.tm || 'N/A'}</p>
                    <p><strong>온도:</strong> {weatherInfo.tm2m !== undefined ? `${weatherInfo.tm2m}°C` : 'N/A'}</p>
                    <p><strong>습도:</strong> {weatherInfo.hm2m !== undefined ? `${weatherInfo.hm2m}%` : 'N/A'}</p>
                    <p><strong>풍향:</strong> {weatherInfo.wd2mstr || 'N/A'}</p>
                    <p><strong>풍속:</strong> {weatherInfo.ws2m !== undefined ? `${weatherInfo.ws2m} m/s` : 'N/A'}</p>
                </div>
            )}
        </div>
    );
};

const VWorldMap = () => {
    const liveMarkerSourceRef = useRef(null); // 실시간 마커를 위한 새로운 소스(Source) ref
    const [liveMarkers, setLiveMarkers] = useState([]); // 서버에서 받아온 마커 데이터를 저장할 state
    const mapContainerRef = useRef(null);
    const olMapRef = useRef(null);
    const layerRefs = useRef({});
    const sliderUpdateTimeoutRef = useRef(null);

    const gridSourceRef = useRef(null);
    const predictionSourceRef = useRef(null);
    const predictionLayerRef = useRef(null);
    const boundarySourceRef = useRef(null);
    const boundaryLayerRef = useRef(null);
    const simulationDataRef = useRef(null);

    const [logicalLayersConfig] = useState(initialLogicalLayersConfig);
    
    const [layerVisibility, setLayerVisibility] = useState(() => {
        const initialVisibility = {};
        logicalLayersConfig.forEach(group => {
            if (group && group.name) initialVisibility[group.name] = group.visible;
        });
        return initialVisibility;
    });

    const [layerOpacities, setLayerOpacities] = useState({
        '산불 확산 시뮬레이션': 1,
        '아산천안 임상도': 1,
        '등산로': 1,
        '아산천안 토양도': 1,
        '연료 등급 지도': 0.8,
    });
    
    const [collapsedLegends, setCollapsedLegends] = useState(() => {
        const initialCollapsed = {};
        logicalLayersConfig.forEach(group => {
            if (group && group.name && group.isCollapsibleLegend) {
                initialCollapsed[group.name] = group.defaultCollapsed !== undefined ? group.defaultCollapsed : true;
            }
        });
        return initialCollapsed;
    });
    
    const [selectedStation, setSelectedStation] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationError, setSimulationError] = useState(null);
    const [simulationTime, setSimulationTime] = useState(0);
    const simulationTimeRef = useRef(simulationTime);
    const [currentBoundaryFeature, setCurrentBoundaryFeature] = useState(null);
    const [activeTimeBoundaries, setActiveTimeBoundaries] = useState(null);
    const MAX_SIM_TIME = 6 * 3600;

    useEffect(() => {
        simulationTimeRef.current = simulationTime;
    }, [simulationTime]);

    const fuelRatingStyleFunction = useCallback((feature) => {
        const fuelScore = feature.get('fuel_score'); 
        const color = fuelRatingColorMap[fuelScore] ?? 'rgba(0, 0, 0, 0)';

        return new Style({
            image: new CircleStyle({
                radius: 2.5,
                fill: new Fill({ color: color }),
            }),
        });
    }, []);


    // 기존 스타일 함수들(fuelRatingStyleFunction 등) 근처에 추가합니다.
    const liveMarkerStyleFunction = useCallback((feature) => {
        const color = feature.get('color') || 'gray'; // 마커의 color 속성을 가져옴
        const colorMap = {
            'red': 'rgba(220, 53, 69, 0.8)',
            'green': 'rgba(25, 135, 84, 0.8)',
            'gray': 'rgba(108, 117, 125, 0.8)'
        };

        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: colorMap[color] }),
                stroke: new Stroke({ color: 'white', width: 1.5 }),
                points: 4, // 4는 사각형
                radius: 20, // 사각형 크기
                angle: Math.PI / 4 // 45도 회전 (정사각형으로 보이게)
            })
        });
    }, []);





    const transparentStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: 'rgba(0,0,0,0)' }) }) }), []);
    const burnedOutStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: fireSpreadColors.burned_out }) }) }), []);
    const burningStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: fireSpreadColors.burning }) }) }), []);
    const predictedStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: fireSpreadColors.predicted }) }) }), []);
    const mappedGridDataStyleFunction = useCallback(() => new Style({ image: new CircleStyle({ radius: 2.5, fill: new Fill({ color: 'rgba(0, 128, 0, 0.6)' }) }) }), []);
    const predictionPointStyleFunction = useCallback((feature) => {
        const { ignitionTime, burnoutTime } = feature.getProperties();
        const currentSimTime = simulationTimeRef.current;
        const lookaheadTime = 3600;
        if (ignitionTime == null) return transparentStyle;
        if (burnoutTime != null && currentSimTime >= burnoutTime) return burnedOutStyle;
        if (currentSimTime >= ignitionTime) return burningStyle;
        if (ignitionTime <= currentSimTime + lookaheadTime) return predictedStyle;
        return transparentStyle;
    }, [transparentStyle, burnedOutStyle, burningStyle, predictedStyle]);
    const boundaryStyleFunction = useCallback(() => new Style({ fill: new Fill({ color: 'rgba(173, 216, 230, 0.4)' }), stroke: new Stroke({ color: 'rgba(135, 206, 250, 0.7)', width: 1 }) }), []);


    useEffect(() => {
        if (!mapContainerRef.current || olMapRef.current) return;
        
        const gSource = new VectorSource();
        const pSource = new VectorSource();
        const bSource = new VectorSource();
        gridSourceRef.current = gSource;
        predictionSourceRef.current = pSource;
        boundarySourceRef.current = bSource;

        const map = new Map({
            target: mapContainerRef.current,
            layers: [ new TileLayer({ source: new XYZ({ url: VWORLD_XYZ_URL }) }), ],
            view: new View({ center: [127.5, 36.5], zoom: 9, projection: 'EPSG:4326' }),
        });
        olMapRef.current = map;


        const lSource = new VectorSource();
        liveMarkerSourceRef.current = lSource;
        
        const liveMarkerLayer = new VectorLayer({
            source: liveMarkerSourceRef.current,
            style: liveMarkerStyleFunction,
            zIndex: 10 // 다른 레이어들보다 위에 보이도록 z-index 설정
        });
        map.addLayer(liveMarkerLayer);





        const boundaryLayer = new VectorLayer({ source: boundarySourceRef.current, style: boundaryStyleFunction, zIndex: 1 });
        boundaryLayerRef.current = boundaryLayer;
        map.addLayer(boundaryLayer);

        const currentLayerObjects = {};
        logicalLayersConfig.forEach(groupConfig => {
            let layerObject;
            
            if (groupConfig.type === 'fuel_rating') {
                const vectorSource = new VectorSource({});
                layerObject = new VectorLayer({
                    source: vectorSource,
                    style: fuelRatingStyleFunction,
                    visible: groupConfig.visible,
                    opacity: layerOpacities[groupConfig.name] || 1,
                });
                fetch(groupConfig.url)
                    .then(res => res.json())
                    .then(geojson => {
                        const features = new GeoJSON().readFeatures(geojson, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: map.getView().getProjection()
                        });
                        vectorSource.addFeatures(features);
                    }).catch(console.error);
                map.addLayer(layerObject);
            } else if (groupConfig.type === 'soil' || groupConfig.type === 'imsangdo') {
                const wmsLayers = [];
                if(groupConfig.layerNames && Array.isArray(groupConfig.layerNames)){
                    groupConfig.layerNames.forEach(individualLayerName => {
                        const wmsSource = new TileWMS({ 
                            url: groupConfig.url, 
                            params: { 'LAYERS': individualLayerName, 'FORMAT': 'image/png', 'TILED': true, 'VERSION': '1.1.1' }, 
                            serverType: 'geoserver', 
                            projection: 'EPSG:4326'
                        });
                        const wmsLayer = new TileLayer({ 
                            source: wmsSource, 
                            visible: groupConfig.visible, 
                            opacity: layerOpacities[groupConfig.name] || 1 
                        });
                        map.addLayer(wmsLayer);
                        wmsLayers.push(wmsLayer);
                    });
                }
                layerObject = wmsLayers; 
            } else if (groupConfig.type === 'hiking_trail') {
                const vectorSource = new VectorSource({});
                layerObject = new VectorLayer({ 
                    source: vectorSource, 
                    style: hikingTrailStyle, 
                    visible: groupConfig.visible, 
                    opacity: layerOpacities[groupConfig.name] || 1
                });
                if (groupConfig.fileUrls && groupConfig.fileUrls[0]) {
                    fetch(process.env.PUBLIC_URL + groupConfig.fileUrls[0])
                        .then(response => response.ok ? response.json() : Promise.reject('GeoJSON not found'))
                        .then(geojson => { 
                            const features = new GeoJSON().readFeatures(geojson, { 
                                dataProjection: 'EPSG:4326', 
                                featureProjection: map.getView().getProjection() 
                            }); 
                            vectorSource.addFeatures(features); 
                        }).catch(console.error);
                }
                map.addLayer(layerObject);
            } else if (groupConfig.type === 'mapped_grid_data_vector') {
                layerObject = new VectorLayer({ source: gridSourceRef.current, style: mappedGridDataStyleFunction, });
                fetch(groupConfig.url).then(res => res.json()).then(geojson => {
                    const features = new GeoJSON().readFeatures(geojson, { dataProjection: 'EPSG:4326', featureProjection: map.getView().getProjection() });
                    gridSourceRef.current.addFeatures(features);
                }).catch(console.error);
                map.addLayer(layerObject);
            } else if (groupConfig.type === 'fire_prediction_vector') {
                layerObject = new VectorLayer({ source: predictionSourceRef.current, style: predictionPointStyleFunction, zIndex: 2 });
                predictionLayerRef.current = layerObject;
                map.addLayer(layerObject);
            } else if (groupConfig.type === 'mountain_station_markers') {
                 const stationFeatures = mountainStationsData.map(station => new Feature({
                    geometry: new Point([station.longitude, station.latitude]),
                    ...station
                }));
                const stationSource = new VectorSource({ features: stationFeatures });
                layerObject = new VectorLayer({ source: stationSource, style: mountainMarkerStyle });
                map.addLayer(layerObject);
            }
            if (layerObject) {
                currentLayerObjects[groupConfig.name] = layerObject;
            }
        });
        layerRefs.current = currentLayerObjects;

        map.on('click', async (event) => {
            if (isSimulating) return;
            
            const stationLayer = layerRefs.current['산악기상관측소 마커'];
            let stationClicked = false;
            if (stationLayer && stationLayer.getVisible()) {
                map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
                    if (layer === stationLayer) {
                        setSelectedStation(feature.getProperties());
                        stationClicked = true;
                    }
                }, { hitTolerance: 5 });
            }
            if (stationClicked) return;

            const gridLayer = layerRefs.current['전국 격자 데이터'];
            if (!gridLayer || !gridLayer.getVisible()) return;
            const features = map.getFeaturesAtPixel(event.pixel, { layerFilter: l => l === gridLayer, hitTolerance: 5 });
            if (features && features.length > 0) {
                const ignitionId = features[0].get('id');
                if (window.confirm(`ID: ${ignitionId} 지점에서 산불 시뮬레이션을 시작하시겠습니까?`)) {
                    setSelectedStation(null);
                    handleRunSimulation(ignitionId);
                }
            }
        });

        return () => { if (olMapRef.current) { olMapRef.current.dispose(); olMapRef.current = null; }};
    }, []);

    useEffect(() => {
        Object.entries(layerVisibility).forEach(([name, isVisible]) => {
            if (layerRefs.current[name]) {
                const layerOrLayers = layerRefs.current[name];
                if (Array.isArray(layerOrLayers)) {
                    layerOrLayers.forEach(layer => layer.setVisible(isVisible));
                } else {
                    layerOrLayers.setVisible(isVisible);
                }
            }
        });
    }, [layerVisibility]);

    useEffect(() => {
        Object.entries(layerOpacities).forEach(([name, opacity]) => {
            if (layerRefs.current[name]) {
                const layerOrLayers = layerRefs.current[name];
                if (Array.isArray(layerOrLayers)) {
                    layerOrLayers.forEach(layer => layer.setOpacity(opacity));
                } else {
                    layerOrLayers.setOpacity(opacity);
                }
            }
        });
    }, [layerOpacities]);

    useEffect(() => { if (predictionLayerRef.current) { predictionLayerRef.current.setStyle(predictionPointStyleFunction); } }, [predictionPointStyleFunction]);
    
    useEffect(() => { if (predictionSourceRef.current && predictionSourceRef.current.getFeatures().length > 0 && simulationDataRef.current) { predictionSourceRef.current.changed(); } }, [simulationTime]);
    
    useEffect(() => {
        if (!activeTimeBoundaries || !olMapRef.current) { if (boundarySourceRef.current) { boundarySourceRef.current.clear(); setCurrentBoundaryFeature(null); } return; }
        const timeBoundaries = activeTimeBoundaries;
        if (!Array.isArray(timeBoundaries) || timeBoundaries.length === 0) { if (boundarySourceRef.current) { boundarySourceRef.current.clear(); setCurrentBoundaryFeature(null); } return; }
        let bestBoundary = null;
        for (let i = timeBoundaries.length - 1; i >= 0; i--) { if (timeBoundaries[i].time <= simulationTime) { bestBoundary = timeBoundaries[i]; break; } }
        if (!bestBoundary && timeBoundaries.length > 0 && simulationTime < timeBoundaries[0].time) {} else if (!bestBoundary && timeBoundaries.length > 0) { bestBoundary = timeBoundaries[timeBoundaries.length -1]; }
        if (boundarySourceRef.current) {
            boundarySourceRef.current.clear(); setCurrentBoundaryFeature(null);
            if (bestBoundary && bestBoundary.polygon) {
                try {
                    const boundaryFeature = new GeoJSON().readFeature(bestBoundary.polygon, { dataProjection: 'EPSG:4326', featureProjection: olMapRef.current.getView().getProjection() });
                    if (boundaryFeature) {
                        const geometry = boundaryFeature.getGeometry();
                        if (geometry) { boundarySourceRef.current.addFeature(boundaryFeature); setCurrentBoundaryFeature(boundaryFeature); }
                    }
                } catch (error) { console.error(`Error processing boundary polygon for time ${bestBoundary.time}s:`, error); }
            }
        }
    }, [simulationTime, activeTimeBoundaries]);

    const handleRunSimulation = useCallback(async (ignitionId) => {
        setIsSimulating(true); 
        setSimulationError(null); 
        predictionSourceRef.current?.clear(); 
        boundarySourceRef.current?.clear(); 
        simulationDataRef.current = null; 
        setActiveTimeBoundaries(null); 
        setCurrentBoundaryFeature(null); 
        setSimulationTime(0);
        if (layerRefs.current['전국 격자 데이터']) { 
            layerRefs.current['전국 격자 데이터'].setVisible(false); 
        }
        try {
            const response = await fetch('http://123.212.210.230:4444/api/predict-fire-spread', { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ ignition_id: ignitionId })
            });
            if (!response.ok) { 
                const errData = await response.json(); 
                throw new Error(errData.error || '시뮬레이션 API 요청 실패'); 
            }
            const results = await response.json();
            simulationDataRef.current = results;
            if (results && results.timeBoundaries) { 
                setActiveTimeBoundaries(results.timeBoundaries); 
            } else { 
                setActiveTimeBoundaries(null); 
            }
            if (results && results.features && Array.isArray(results.features)) {
                const geoJsonInput = { type: 'FeatureCollection', features: results.features };
                const mapProjection = olMapRef.current.getView().getProjection();
                let pointFeatures = [];
                try {
                    pointFeatures = new GeoJSON().readFeatures(geoJsonInput, { dataProjection: 'EPSG:4326', featureProjection: mapProjection });
                    predictionSourceRef.current.addFeatures(pointFeatures);
                } catch (error) { 
                    console.error('[FE] Error during GeoJSON().readFeatures() or addFeatures():', error); 
                }
            }
            if (results && ((results.features && results.features.length > 0) || (results.timeBoundaries && results.timeBoundaries.length > 0))) { 
                setSimulationTime(0); 
            }
        } catch (error) { 
            console.error("Simulation Error:", error); 
            setSimulationError(error.message); 
        } finally { 
            setIsSimulating(false); 
        }
    }, []);
    
    const formatTime = (elapsedSeconds) => {
        const displayHours = Math.floor(elapsedSeconds / 3600);
        const displayMinutes = Math.floor((elapsedSeconds % 3600) / 60);
        return `${String(displayHours).padStart(2, '0')}시간 ${String(displayMinutes).padStart(2, '0')}분`;
    };

    const handleSliderChange = useCallback((newTimeNumeric) => {
        if (sliderUpdateTimeoutRef.current) { 
            clearTimeout(sliderUpdateTimeoutRef.current); 
        }
        sliderUpdateTimeoutRef.current = setTimeout(() => { 
            setSimulationTime(newTimeNumeric); 
        }, 300);
    }, []);

    const resetSimulation = () => {
        predictionSourceRef.current?.clear(); 
        boundarySourceRef.current?.clear(); 
        simulationDataRef.current = null; 
        setActiveTimeBoundaries(null); 
        setCurrentBoundaryFeature(null);
        setSimulationTime(0); 
        setSimulationError(null); 
        setIsSimulating(false);
        if (layerRefs.current['전국 격자 데이터']) { 
            layerRefs.current['전국 격자 데이터'].setVisible(true); 
        }
        setSelectedStation(null);
    };

    const handleToggleVisibility = useCallback((name) => {
        setLayerVisibility(prev => ({...prev, [name]: !prev[name]}));
        if (name === '산악기상관측소 마커' && layerVisibility[name]) {
            setSelectedStation(null);
        }
    }, [layerVisibility]);

    const handleOpacityChange = useCallback((name, opacity) => {
        setLayerOpacities(prev => ({...prev, [name]: opacity}));
    }, []);

    const handleToggleLegendCollapse = useCallback((name) => {
        setCollapsedLegends(p => ({ ...p, [name]: !p[name] }));
    }, []);

    
    // VWorldMap 컴포넌트의 return 문 바로 위에, 이 useEffect 훅 하나만 추가하세요.
    useEffect(() => {
        // 실시간 마커를 위한 VectorSource와 Layer가 아직 없으면 생성
        if (!liveMarkerSourceRef.current && olMapRef.current) {
            const lSource = new VectorSource();
            liveMarkerSourceRef.current = lSource;

            const liveMarkerLayer = new VectorLayer({
                source: liveMarkerSourceRef.current,
                style: liveMarkerStyleFunction, // 이전에 추가한 스타일 함수
                zIndex: 10
            });
            olMapRef.current.addLayer(liveMarkerLayer);
        }

        const fetchAndDrawMarkers = async () => {
        try {
            const response = await fetch(`/data/fire_markers.json?t=${Date.now()}`);
            if (!response.ok) {
            console.error('실시간 마커 데이터 로드 실패:', response.status);
            liveMarkerSourceRef.current.clear(); // 파일이 없으면 기존 마커 지우기
            return;
            }
            const markers = await response.json();

            // 마커 그리기
            if (liveMarkerSourceRef.current) {
                liveMarkerSourceRef.current.clear(); // 기존 마커 모두 지우기
                if (markers && markers.length > 0) {
                    const newFeatures = markers.map(marker => {
                        // [marker.lon, marker.lat] 좌표가 'EPSG:4326' 임을 명시적으로 알려줍니다.
                        const transformedCoords = transform([marker.lon, marker.lat], 'EPSG:4326', 'EPSG:4326');
                        
                        return new Feature({
                            geometry: new Point(transformedCoords),
                            color: marker.color
                        });
                    });
                    liveMarkerSourceRef.current.addFeatures(newFeatures);
                }
            }
        } catch (error) {
            console.error('실시간 마커 데이터 처리 중 오류:', error);
        }
        };

        // 1. 처음 로딩 시 즉시 실행
        fetchAndDrawMarkers();

        // 2. 1분마다 주기적으로 다시 실행
        const interval = setInterval(fetchAndDrawMarkers, 60000);

        // 3. 컴포넌트가 사라질 때 인터벌 정리
        return () => clearInterval(interval);
    }, []); // 의존성 배열을 비워서, 이 모든 로직이 처음 한 번만 설정되도록 함


    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
            
            <WeatherDisplay selectedStationInfo={selectedStation} />
            
            <div style={{
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '15px', borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 1000, width: '70%', maxWidth: '800px'
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <b style={{fontSize: '14px', minWidth: '110px'}}>시간: {formatTime(simulationTime)}</b>
                    <input type="range" min="0" max={MAX_SIM_TIME} step="600" value={simulationTime} onChange={(e) => handleSliderChange(Number(e.target.value))} style={{ flexGrow: 1, cursor: 'pointer' }} disabled={!predictionSourceRef.current || predictionSourceRef.current.getFeatures().length === 0}/>
                </div>
                <div style={{display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px'}}>
                    <button onClick={() => setSimulationTime(1 * 3600)} disabled={!predictionSourceRef.current || predictionSourceRef.current.getFeatures().length === 0}>1시간 후</button>
                    <button onClick={() => setSimulationTime(3 * 3600)} disabled={!predictionSourceRef.current || predictionSourceRef.current.getFeatures().length === 0}>3시간 후</button>
                    <button onClick={() => setSimulationTime(MAX_SIM_TIME)} disabled={!predictionSourceRef.current || predictionSourceRef.current.getFeatures().length === 0}>최종 결과</button>
                    <button onClick={resetSimulation} title="시뮬레이션을 초기화하고 발화점을 다시 선택합니다.">리셋</button>
                </div>
                {isSimulating && <p style={{color: 'blue', textAlign: 'center', margin: '10px 0 0 0'}}>시뮬레이션 계산 중...</p>}
                {simulationError && <p style={{color: 'red', textAlign: 'center', margin: '10px 0 0 0'}}>오류: {simulationError}</p>}
            </div>
            
            <Legend
                logicalLayersConfig={logicalLayersConfig}
                layerVisibility={layerVisibility}
                collapsedLegends={collapsedLegends}
                onToggleLegendCollapse={handleToggleLegendCollapse}
                onToggleVisibility={handleToggleVisibility}
                layerOpacities={layerOpacities}
                onOpacityChange={handleOpacityChange}
            />
        </div>
    );
};

export default VWorldMap;