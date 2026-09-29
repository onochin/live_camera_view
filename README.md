# live_camera_view

静岡県東部の道路点検向けに、複数管理者が公開する道路ライブカメラを1つのWebMapから確認するための個人用ビューアです。

## 現在の状態

v0.2（2026-09-29）

- MapLibre GL JS 6.11.2
- 地理院 淡色地図 / 標準地図 / 写真を切替
- Mapterhorn DEMによる3D地形表示
- カメラGeoJSON表示
- 管理者・エリア・文字検索
- カメラPopup
- 静岡県の直接画像型カメラはPopup内に静止画表示
- 国交省 伊豆縦貫道11地点は個別の公式JPEGをPopup内に表示
- NEXCO中日本はiHighwayへのリンク地点として表示
- 位置精度を ● / ■ で区別
- PC / スマートフォン向けレスポンシブ表示

### 台帳と地図表示件数

- `data/camera_inventory.csv`: 68地点
- `data/cameras.geojson`: 22マーカー
  - 道路ライブカメラ: 18地点
  - NEXCO iHighwayリンク: 4地点

### 位置記号

- `●` 比較的確かな位置（峠・施設等の位置を確認できたもの）
- `■` 近傍・代表位置（公式KP・所在地等からの概略位置を含む）

伊豆縦貫自動車道（東駿河湾環状道路）の11カメラは、公式一覧に記載された地点名・KPと個別JPEG URLを使用しています。座標はカメラ支柱そのものの座標を確認できない地点があるため `■` として表示します。

## 起動

WSL / Ubuntuでリポジトリ直下から:

```bash
python3 -m http.server 8200
```

ブラウザ:

```text
http://localhost:8200/
```

`index.html` を直接 `file://` で開くと、ブラウザの制約により `data/cameras.geojson` を取得できない場合があるため、HTTPサーバー経由で確認してください。

## 3D地形

v0.2では鍵不要で利用できるMapterhornの全球DEMをMapLibreの `raster-dem` として利用します。

- 目的: 地形とカメラ標高・山地位置関係の把握
- 現状: 全球30m級を基本とするため、詳細地形解析用ではない
- 将来: 静岡県公開DEM、自作Terrain-RGB/PMTiles等への差替えを検討

## データ

### `data/camera_inventory.csv`

公式公開元から収集したカメラ台帳の正本候補です。

### `data/cameras.geojson`

WebMapで実際に表示する地点です。

主な属性:

- `camera_id`
- `provider`
- `office`
- `route_no`
- `route_name`
- `camera_name`
- `area`
- `municipality`
- `elevation_m`
- `camera_url`
- `source_url`
- `display_type`
- `coordinate_precision`
- `coordinate_source`
- `location_note`

## 注意

- 本ビューアは各機関の公開情報を集約する個人利用向けツールです。
- 位置情報には、カメラ支柱の正確な座標ではなく、公開されているKP、峠、交差点、構造物等の代表位置を用いる場合があります。
- `■` は特に近傍・代表位置であることを示します。
- 道路通行時は実際の交通規制・現地状況を優先してください。

## 次の作業候補

1. 国道1号 箱根峠13地点を地図へ追加
2. 国道138号 須走3地点を地図へ追加
3. 国道246号 小山7地点を地図へ追加
4. 静岡県カメラの未配置地点を追加
5. 標高の付与
6. 霧確認モード（標高順比較）
7. 静岡県高解像度DEMへの3D地形差替え
