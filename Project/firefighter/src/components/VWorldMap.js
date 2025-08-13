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
import { transform } from 'ol/proj';
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
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseConfig';
import { getHistory, saveHistory } from '../service/historyApiService';
import { getFavorites, addFavorite, removeFavorite } from '../service/apiService';
import FavoritesList from './FavoritesList';
import HistoryList from './HistoryList';

import { Link } from 'react-router-dom';
import logoImage from '../assets/firefighter_logo.png';

<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '16px 24px',
  backgroundColor: '#f5f5f5',
  borderBottom: '1px solid #ccc',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  zIndex: 10000, // ⭐ 다른 요소보다 위로
}}>
  <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
    <img src={logoImage} alt="로고" style={{ height: '28px', width: '28px', marginRight: '8px' }} />
    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#333' }}>
      <span style={{ color: '#EB5C42' }}>Fire</span>Fighter
    </span>
  </Link>
</div>




const WeatherDisplay = ({ selectedStationInfo, onToggleFavorite, isLoggedIn, isFavorite }) => {
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
        position: 'absolute', top: '50px', right: '7px', zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '15px',
        borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '280px', fontSize: '13px'
    };

    return (
        <div style={displayStyle}>
            <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
                {selectedStationInfo.name} 기상 정보
                {isLoggedIn && (
                    <button
                        onClick={onToggleFavorite}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#f0c419' }}
                        title={isFavorite ? "즐겨찾기에서 삭제" : "즐겨찾기에 추가"}
                    >
                        {isFavorite ? '★' : '☆'}
                    </button>
                )}
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
    const [user] = useAuthState(auth);
    const [favorites, setFavorites] = useState([]);
    const [history, setHistory] = useState([]);
    const mapContainerRef = useRef(null);
    const olMapRef = useRef(null);
    const layerRefs = useRef({});
    
    const predictionSourceRef = useRef(null);
    const boundarySourceRef = useRef(null);
    const gridSourceRef = useRef(null);
    const liveMarkerSourceRef = useRef(null);
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
    const [maxSimTime, setMaxSimTime] = useState(6 * 3600);
    const [simulationScenario, setSimulationScenario] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const animationFrameId = useRef(null);
    const lastFrameTime = useRef(null);
    const simulationTimeRef = useRef(simulationTime);

    const [currentBoundaryFeature, setCurrentBoundaryFeature] = useState(null);
    const [activeTimeBoundaries, setActiveTimeBoundaries] = useState(null);


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

    const liveMarkerStyleFunction = useCallback((feature) => {
        const color = feature.get('color') || 'gray';
        const colorMap = {
            'red': 'rgba(220, 53, 69, 0.8)',
            'green': 'rgba(25, 135, 84, 0.8)',
            'gray': 'rgba(108, 117, 125, 0.8)'
        };

        return new Style({
            image: new RegularShape({
                fill: new Fill({ color: colorMap[color] }),
                stroke: new Stroke({ color: 'white', width: 1.5 }),
                points: 4,
                radius: 20,
                angle: Math.PI / 4
            })
        });
    }, []);

    const transparentStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: 'rgba(0,0,0,0)' }) }) }), []);
    const burnedOutStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: fireSpreadColors.burned_out }) }) }), []);
    const burningStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: fireSpreadColors.burning }) }) }), []);
    const predictedStyle = useMemo(() => new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: fireSpreadColors.predicted }) }) }), []);
    
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
        const animationLoop = (timestamp) => {
            if (!lastFrameTime.current) {
                lastFrameTime.current = timestamp;
            }
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
        } else {
            cancelAnimationFrame(animationFrameId.current);
        }

        return () => cancelAnimationFrame(animationFrameId.current);
    }, [isPlaying, maxSimTime]);

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
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: VWORLD_XYZ_URL,
                        crossOrigin: 'anonymous'
                    })
                })
            ],
            view: new View({ center: [127.5, 36.5], zoom: 9, projection: 'EPSG:4326' }),
        });
        olMapRef.current = map;

        const lSource = new VectorSource();
        liveMarkerSourceRef.current = lSource;
        
        const liveMarkerLayer = new VectorLayer({
            source: liveMarkerSourceRef.current,
            style: liveMarkerStyleFunction,
            zIndex: 10
        });
        map.addLayer(liveMarkerLayer);

        const boundaryLayer = new VectorLayer({ source: boundarySourceRef.current, style: boundaryStyleFunction, zIndex: 1 });
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
                            projection: 'EPSG:4326',
                            crossOrigin: 'anonymous'
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
                layerObject = new VectorLayer({ 
                    source: gridSourceRef.current,
                     style: new Style({ image: new CircleStyle({ radius: 2.5, fill: new Fill({ color: 'rgba(0, 128, 0, 0.6)' }) }) }),
                     visible: layerVisibility[groupConfig.name]  });
                   
                fetch(groupConfig.url).then(res => res.json()).then(geojson => {
                    const features = new GeoJSON().readFeatures(geojson, { dataProjection: 'EPSG:4326', featureProjection: map.getView().getProjection() });
                    gridSourceRef.current.addFeatures(features);
                }).catch(console.error);
                map.addLayer(layerObject);
            } else if (groupConfig.type === 'fire_prediction_vector') {
                layerObject = new VectorLayer({ source: predictionSourceRef.current, style: predictionPointStyleFunction, zIndex: 2 });
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

    useEffect(() => {
        if (predictionSourceRef.current) {
            predictionSourceRef.current.changed();
        }
    }, [simulationTime]);
    
    useEffect(() => {
        if (!activeTimeBoundaries || !olMapRef.current) {
            if (boundarySourceRef.current) {
                boundarySourceRef.current.clear();
                setCurrentBoundaryFeature(null);
            }
            return;
        }
        const timeBoundaries = activeTimeBoundaries;
        if (!Array.isArray(timeBoundaries) || timeBoundaries.length === 0) {
            if (boundarySourceRef.current) {
                boundarySourceRef.current.clear();
                setCurrentBoundaryFeature(null);
            }
            return;
        }
        let bestBoundary = null;
        for (let i = timeBoundaries.length - 1; i >= 0; i--) {
            if (timeBoundaries[i].time <= simulationTime) {
                bestBoundary = timeBoundaries[i];
                break;
            }
        }
        if (!bestBoundary && timeBoundaries.length > 0 && simulationTime < timeBoundaries[0].time) {
        } else if (!bestBoundary && timeBoundaries.length > 0) {
            bestBoundary = timeBoundaries[timeBoundaries.length - 1];
        }

        if (boundarySourceRef.current) {
            boundarySourceRef.current.clear();
            setCurrentBoundaryFeature(null);
            if (bestBoundary && bestBoundary.polygon) {
                try {
                    const boundaryFeature = new GeoJSON().readFeature(bestBoundary.polygon, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: olMapRef.current.getView().getProjection()
                    });
                    if (boundaryFeature) {
                        const geometry = boundaryFeature.getGeometry();
                        if (geometry) {
                            boundarySourceRef.current.addFeature(boundaryFeature);
                            setCurrentBoundaryFeature(boundaryFeature);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing boundary polygon for time ${bestBoundary.time}s:`, error);
                }
            }
        }
    }, [simulationTime, activeTimeBoundaries]);

    const handleRunSimulation = useCallback(async (ignitionId) => {
        setIsSimulating(true);
        setSimulationError(null);
        resetSimulation();

        try {
            const response = await fetch('/api/predict-fire-spread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ignition_id: ignitionId })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || '시뮬레이션 API 요청 실패');
            }

            const results = await response.json();
            
            loadSimulationData(results);
            
            setIsPlaying(true);

        } catch (error) {
            console.error("Simulation Error:", error);
            setSimulationError(error.message);
        } finally {
            setIsSimulating(false);
        }
    }, []);
    
    const loadSimulationData = (data) => {
        if (!data || !data.features) {
            console.error("불러올 시뮬레이션 데이터가 유효하지 않습니다.");
            return;
        }
        
        resetSimulation();

        simulationDataRef.current = data;
        setMaxSimTime(data.simulationEndTime || (6 * 3600));
        setSimulationScenario(data.scenarioName || '정보 없음');
        setActiveTimeBoundaries(data.timeBoundaries || null);

        if (Array.isArray(data.features)) {
            const geoJsonInput = { type: 'FeatureCollection', features: data.features };
            const mapProjection = olMapRef.current.getView().getProjection();
            const pointFeatures = new GeoJSON().readFeatures(geoJsonInput, { dataProjection: 'EPSG:4326', featureProjection: mapProjection });
            predictionSourceRef.current.addFeatures(pointFeatures);
        }
        
        setLayerVisibility(prev => ({...prev, ['전국 격자 데이터']: false}));
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        return `${h}시간 ${m}분`;
    };

    const handleSliderChange = (newTime) => {
        setIsPlaying(false);
        setSimulationTime(newTime);
    };

    const resetSimulation = () => {
        setIsPlaying(false);
        predictionSourceRef.current?.clear();
        boundarySourceRef.current?.clear();
        simulationDataRef.current = null;
        setSimulationTime(0);
        setMaxSimTime(6 * 3600);
        setSimulationScenario(null);
        setSimulationError(null);
        setIsSimulating(false);
        setActiveTimeBoundaries(null);
        setLayerVisibility(prev => ({...prev, ['전국 격자 데이터']: true})); 
        setSelectedStation(null);
    };
    
    const handleSaveSimulation = useCallback(async () => {
        if (!user) {
            alert("내역을 저장하려면 로그인이 필요합니다.");
            return;
        }
        if (!simulationDataRef.current) {
            alert("저장할 시뮬레이션 결과가 없습니다.");
            return;
        }

        const title = window.prompt("이 시뮬레이션 내역의 제목을 입력하세요:", `시뮬레이션 - ${new Date().toLocaleString()}`);
        if (!title) {
            alert("제목이 입력되지 않아 저장을 취소합니다.");
            return;
        }

        try {
            const idToken = await user.getIdToken();
            const historyData = {
                title: title,
                simulationData: simulationDataRef.current
            };

            const savedItem = await saveHistory(historyData, idToken);
            
            setHistory(prevHistory => [{ ...historyData, id: savedItem.id, createdAt: new Date() }, ...prevHistory]);

            alert("시뮬레이션 내역이 성공적으로 저장되었습니다!");

        } catch (error) {
            console.error("내역 저장 중 오류 발생:", error);
            alert(`오류가 발생하여 저장하지 못했습니다: ${error.message}`);
        }
    }, [user]);

    const handleLoadHistory = (historyItem) => {
        if (historyItem && historyItem.simulationData) {
            console.log("저장된 시뮬레이션 불러오기:", historyItem.title);
            loadSimulationData(historyItem.simulationData);
            setIsPlaying(true);
        } else {
            alert("시뮬레이션 데이터를 불러오는 데 실패했습니다.");
        }
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

    useEffect(() => {
        if (!liveMarkerSourceRef.current && olMapRef.current) {
            const lSource = new VectorSource();
            liveMarkerSourceRef.current = lSource;

            const liveMarkerLayer = new VectorLayer({
                source: liveMarkerSourceRef.current,
                style: liveMarkerStyleFunction,
                zIndex: 10
            });
            olMapRef.current.addLayer(liveMarkerLayer);
        }

        const fetchAndDrawMarkers = async () => {
        try {
            const response = await fetch(`/data/fire_markers.json?t=${Date.now()}`);
            if (!response.ok) {
            console.error('실시간 마커 데이터 로드 실패:', response.status);
            liveMarkerSourceRef.current.clear();
            return;
            }
            const markers = await response.json();

            if (liveMarkerSourceRef.current) {
                liveMarkerSourceRef.current.clear();
                if (markers && markers.length > 0) {
                    const newFeatures = markers.map(marker => {
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

        fetchAndDrawMarkers();
        const interval = setInterval(fetchAndDrawMarkers, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleFavoriteSelect = useCallback((favorite) => {
        if (!olMapRef.current || !favorite.lat || !favorite.lon) return;

        const coords = [favorite.lon, favorite.lat];
        const transformedCoords = transform(coords, 'EPSG:4326', olMapRef.current.getView().getProjection());

        olMapRef.current.getView().animate({
            center: transformedCoords,
            zoom: 12,
            duration: 1000
        });
        
        setSelectedStation({
            obsid: favorite.stationId,
            name: favorite.stationName,
            latitude: favorite.lat,
            longitude: favorite.lon
        });

    }, []);

    const handleToggleFavorite = useCallback(async () => {
        if (!user) {
            alert('로그인이 필요한 기능입니다.');
            return;
        }
        if (!selectedStation) {
            alert('관측소를 먼저 선택해주세요.');
            return;
        }
        const idToken = await user.getIdToken();
        const isCurrentlyFavorite = favorites.some(fav => fav.stationId === selectedStation.obsid);
        try {
            if (isCurrentlyFavorite) {
                await removeFavorite(selectedStation.obsid, idToken);
                setFavorites(prev => prev.filter(fav => fav.stationId !== selectedStation.obsid));
                alert(`'${selectedStation.name}'을(를) 즐겨찾기에서 삭제했습니다.`);
            } else {
                await addFavorite(selectedStation, idToken);
                setFavorites(prev => [...prev, {
                    stationId: selectedStation.obsid,
                    stationName: selectedStation.name,
                    lat: selectedStation.latitude,
                    lon: selectedStation.longitude
                }]);
                alert(`'${selectedStation.name}'을(를) 즐겨찾기에 추가했습니다.`);
            }
        } catch (error) {
            console.error('즐겨찾기 처리 오류:', error);
            alert(error.response?.data?.message || '요청 처리 중 오류가 발생했습니다.');
        }
    }, [user, selectedStation, favorites]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            setFavorites([]);
            setSelectedStation(null);
            alert('로그아웃 되었습니다.');
        } catch (error) {
            console.error("로그아웃 오류:", error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    };
    
    const handleLogin = () => {
        window.location.href = "/login";
    };
    
    useEffect(() => {
        if (user) {
            user.getIdToken().then(idToken => {
                getFavorites(idToken)
                    .then(data => {
                        setFavorites(data.favorites || []);
                    })
                    .catch(error => console.error("즐겨찾기 목록 로딩 실패:", error));
                getHistory(idToken)
                    .then(data => setHistory(data || []))
                    .catch(error => console.error("시뮬레이션 내역 로딩 실패:", error));
            });
        } else {
            setFavorites([]);
            setHistory([]);
        }
    }, [user]);

    const handleTogglePlay = () => {
        if (simulationDataRef.current) {
            setIsPlaying(prev => !prev);
        }
    };


    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

            <FavoritesList favorites={favorites} onFavoriteClick={handleFavoriteSelect} isLoggedIn={!!user} />

            <HistoryList 
                history={history}
                isLoggedIn={!!user} 
                onHistoryClick={handleLoadHistory}
            />

            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1002 }}>
                {!user && (
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', 
                        marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={handleLogin} style={{ cursor: 'pointer' }}>로그인</button>
                    </div>
                )}
                {user && (
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', 
                        marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>{user.displayName}님</span>
                        <button onClick={handleLogout} style={{ cursor: 'pointer' }}>로그아웃</button>
                    </div>
                )}
                {selectedStation && (
                    <WeatherDisplay
                        selectedStationInfo={selectedStation}
                        onToggleFavorite={handleToggleFavorite}
                        isLoggedIn={!!user}
                        isFavorite={favorites.some(fav => fav.stationId === selectedStation.obsid)}
                    />
                )}
            </div>
            
            <div style={{
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: 'rgba(239, 239, 239, 0.9)', padding: '15px', borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(223, 96, 76, 0.34)', zIndex: 1000, width: '80%', maxWidth: '900px'
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px'}}>
                    <b style={{fontSize: '14px', minWidth: '120px'}}>
                        시나리오: {simulationScenario || '대기 중'}
                    </b>
                    <b style={{fontSize: '14px', flexGrow: 1, textAlign: 'center'}}>
                        시간: {formatTime(simulationTime)} / {formatTime(maxSimTime)}
                    </b>
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <input 
                        type="range" 
                        min="0" 
                        max={maxSimTime}
                        step="60"
                        value={simulationTime} 
                        onChange={(e) => handleSliderChange(Number(e.target.value))} 
                        style={{ flexGrow: 1, cursor: 'pointer' }} 
                        disabled={!simulationDataRef.current}
                    />
                </div>

                <div style={{display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px'}}>
                    <button onClick={handleTogglePlay} disabled={!simulationDataRef.current}>
                        {isPlaying ? '일시정지' : '재생'}
                    </button>
                    <button onClick={() => handleSliderChange(maxSimTime)} disabled={!simulationDataRef.current}>
                        최종 결과
                    </button>
                    <button onClick={resetSimulation}>리셋</button>
                    <button onClick={handleSaveSimulation} disabled={!user || !simulationDataRef.current}>
                        내역 저장
                    </button>
                </div>
                {isSimulating && <p style={{color: 'blue', textAlign: 'center', margin: '10px 0 0 0'}}>시뮬레이션 계산 중...</p>}
                {simulationError && <p style={{color: 'red', textAlign: 'center', margin: '10px 0 0 0'}}>오류: {simulationError}</p>}
            </div>
            
            <Legend
                logicalLayersConfig={initialLogicalLayersConfig}
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
