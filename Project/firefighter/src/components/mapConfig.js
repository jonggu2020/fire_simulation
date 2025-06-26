import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Circle from 'ol/style/Circle';
import Icon from 'ol/style/Icon';

export const VWORLD_XYZ_URL = 'http://xdworld.vworld.kr:8080/2d/Base/201802/{z}/{x}/{y}.png?apiKey=B60B525E-129D-3B8B-880F-77C24CF86AE3';

export const fireSpreadColors = {
    burning: 'rgba(255, 0, 0, 0.8)',
    predicted: 'rgba(255, 255, 0, 0.8)',
    burned_out: 'rgba(0, 0, 0, 0.8)',
    safe: 'rgba(0, 128, 0, 0.7)'
};
export const fireSpreadDescriptions = {
    burning: '연소 중',
    predicted: '확산 예상 경로',
    burned_out: '연소 완료',
    safe: '안전'
};

export const asanCheonanSoilColorMap = {
    '01': '#c8824c', '02': '#c8ab4f', '03': '#c6c9b7', '05': '#efc27e',
    '06': '#19ee12', '28': '#7182d9', '82': '#d2533f', '91': '#62e0d6',
    '93': '#8ce7b5', '94': '#de386f', '95': '#80ee19', '99': '#128cd2',
};
export const asanCheonanSoilCodeDescriptions = {
    '01': '갈색건조산림토양(1)', '02': '갈색약건산림토양(2)', '03': '갈색적윤산림토양(3)',
    '05': '적색계갈색건조산림토양(5)', '06': '적색계갈색약건산림토양(6)', '28': '암쇄토양(28)',
    '82': '제지(R)', '91': '주거지(S)', '93': '경작지(C)', '94': '수채(W)',
    '95': '과수원(O)', '99': '기타(E)',
};

export const imsangdoColorMap = {
    '0': '#D2B48C', '1': '#38A800', '2': '#B370D7', '3': '#34CA96', '4': '#A1DDA1',
};
export const imsangdoCodeDescriptions = {
    '0': '무립목지 / 비산림', '1': '침엽수림 (수관 75% 이상)',
    '2': '활엽수림 (수관 75% 이상)', '3': '혼효림 (침엽 25~75%)', '4': '죽림',
};

export const hikingTrailStyle = new Style({
    stroke: new Stroke({ color: '#8B4513', width: 2.5, lineDash: [6, 6] }),
});
export const hikingTrailLegendInfo = {
    description: '등산로',
    styleProps: { stroke: { color: '#8B4513', width: 2.5, lineDash: [6, 6] } }
};

export const mountainMarkerStyle = new Style({
    image: new Circle({
        radius: 7,
        fill: new Fill({ color: 'rgba(0, 128, 0, 0.8)' }),
        stroke: new Stroke({ color: 'white', width: 1.5 })
    })
});
export const mountainMarkerLegendInfo = {
    description: '산악기상관측소',
    styleProps: { image: { type: 'circle', radius: 7, fill: { color: 'rgba(0, 128, 0, 0.8)' }, stroke: { color: 'white', width: 1.5 } } }
};

export const fuelRatingColorMap = {
    5: '#d73027', 4: '#fc8d59', 3: '#fee08b', 2: '#d9ef8b', 0: 'rgba(200, 200, 200, 0.5)',
};
export const fuelRatingDescriptions = {
    5: '등급 5 (침엽수림 - 매우 높음)', 4: '등급 4 (혼효림 - 높음)', 3: '등급 3 (활엽수림 - 중간)', 2: '등급 2 (죽림 - 낮음)', 0: '등급 0 (비산림/기타)',
};

export const logicalLayersConfig = [
    { 
        name: '아산천안 토양도', 
        type: 'soil', 
        layerNames: ['ne:Asan_Cheonan_Soil_1', 'ne:Asan_Cheonan_Soil_2', 'ne:Asan_Cheonan_Soil_3'], 
        // [수정] GeoServer URL 변경
        url: 'http://123.212.210.230:5555/geoserver/ne/wms', 
        visible: false, 
        isCollapsibleLegend: true, 
        colorMap: asanCheonanSoilColorMap, 
        codeDescriptions: asanCheonanSoilCodeDescriptions, 
        filterAttribute: 'SLTP_CD'
    },
    { 
        name: '아산천안 임상도', 
        type: 'imsangdo', 
        layerNames: ['ne:imsangdo_part1', 'ne:imsangdo_part2', 'ne:imsangdo_part3'], 
        // [수정] GeoServer URL 변경
        url: 'http://123.212.210.230:5555/geoserver/ne/wms', 
        visible: false,
        isCollapsibleLegend: true, 
        colorMap: imsangdoColorMap, 
        codeDescriptions: imsangdoCodeDescriptions, 
        filterAttribute: 'FRTP_CD'
    },
    { 
        name: '등산로', 
        type: 'hiking_trail', 
        fileUrls: ['/merged_hiking_trails.geojson'], 
        visible: false,
        isCollapsibleLegend: false, 
        legendInfo: hikingTrailLegendInfo 
    },
    {
        name: '연료 등급 지도',
        type: 'fuel_rating',
        // [수정] API 서버 URL을 상대 경로로 변경
        url: '/api/grid-with-fuel-info',
        visible: false,
        isCollapsibleLegend: true,
        defaultCollapsed: false,
        legendInfo: {
            title: '연료 등급',
            type: 'fuel_rating_legend',
            colors: fuelRatingColorMap,
            descriptions: fuelRatingDescriptions,
        }
    },
    {
        name: '산악기상관측소 마커',
        type: 'mountain_station_markers',
        visible: true,
        isCollapsibleLegend: false,
        legendInfo: mountainMarkerLegendInfo,
    },
    { 
        name: '전국 격자 데이터',
        type: 'mapped_grid_data_vector', 
        // [수정] API 서버 URL을 상대 경로로 변경
        url: '/api/mapped-grid-data', 
        visible: false, 
        isCollapsibleLegend: true,
        defaultCollapsed: false,
        legendInfo: {
            title: '격자 상태',
            type: 'simple_point_legend',
            description: '안전 (클릭하여 발화점으로 지정)',
            style: { color: 'rgba(0, 128, 0, 0.6)', radius: 3 }
        },
    },
    {
        name: '산불 확산 시뮬레이션',
        type: 'fire_prediction_vector',
        visible: true,
        isCollapsibleLegend: true,
        defaultCollapsed: false,
        legendInfo: {
            title: '산불 확산 예측 결과',
            type: 'colormap_fire_spread',
            colors: fireSpreadColors,
            descriptions: fireSpreadDescriptions
        },
    },
];