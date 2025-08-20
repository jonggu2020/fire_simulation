// src/components/VWorldMap/MapCanvas.js

import React, { useRef, useEffect, forwardRef } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { VWORLD_XYZ_URL } from './mapConfig'; // VWorld URL 설정이 필요합니다.

const MapCanvas = forwardRef((props, olMapRef) => {
    // 이 ref는 div 엘리먼트 자체에 연결됩니다.
    const mapContainerRef = useRef(null);

    useEffect(() => {
        // 이미 지도 객체가 생성되었거나, 렌더링될 div가 없으면 실행하지 않습니다.
        if (!mapContainerRef.current || olMapRef.current) {
            return;
        }

        // OpenLayers Map 객체 생성
        const map = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: VWORLD_XYZ_URL,
                        crossOrigin: 'anonymous', // 이미지 저장을 위한 crossOrigin 설정
                    }),
                }),
            ],
            view: new View({
                center: [127.5, 36.5],
                zoom: 9,
                projection: 'EPSG:4326',
            }),
            controls: [], // 기본 컨트롤러(줌 버튼 등)는 숨김 처리
        });

        // 부모로부터 받은 ref(olMapRef)에 생성된 map 객체를 할당합니다.
        olMapRef.current = map;

        // 컴포넌트가 사라질 때 맵 리소스를 정리하는 클린업 함수입니다.
        return () => {
            if (olMapRef.current) {
                olMapRef.current.dispose();
                olMapRef.current = null;
            }
        };
    }, [olMapRef]); // olMapRef가 바뀔 때를 감지하여 useEffect를 실행합니다.

    return (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
    );
});

export default MapCanvas;