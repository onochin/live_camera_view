# live_camera_view

静岡県東部の道路点検向けに、複数管理者が公開する道路ライブカメラを1つのWebMapから確認するための個人用ビューアです。

## 現在の状態

v0.1（2026-09-29）

- MapLibre GL JS 6.11.2
- 地理院 淡色地図 / 標準地図 / 写真を切替
- Mapterhorn DEMによる3D地形表示
- カメラGeoJSON表示
- 管理者・エリア・文字検索
- カメラPopup
- 静岡県の直接画像型カメラはPopup内に静止画表示
- 国交省等のグループページ型は公式ページを開く
- PC / スマートフォン向けレスポンシブ表示

### 台帳と地図表示件数

- `data/camera_inventory.csv`: 68地点
- `data/cameras.geojson`: 座標確認済み代表9地点（v0.1）

位置が未確認のカメラを推測座標で表示しない方針とし、公開情報で確認できた地点から順次GeoJSONへ追加します。

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

v0.1では鍵不要で利用できるMapterhornの全球DEMをMapLibreの `raster-dem` として利用します。

- 目的: 地形とカメラ標高・山地位置関係の把握
- 現状: 全球30m級を基本とするため、詳細地形解析用ではない
- 将来: 静岡県公開DEM、自作Terrain-RGB/PMTiles等への差替えを検討

## データ

### `data/camera_inventory.csv`

公式公開元から収集したカメラ台帳の正本候補です。

### `data/cameras.geojson`

WebMapで表示する位置確認済みカメラです。

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

## 注意

- 本ビューアは各機関の公開情報を集約する個人利用向けツールです。
- ライブカメラ映像を再配信するものではありません。
- 位置情報には、カメラ支柱の正確な座標ではなく、公開されている峠・交差点・構造物等の代表位置を用いる場合があります。その場合は `coordinate_precision` に区分を記録します。
- 道路通行時は実際の交通規制・現地状況を優先してください。

## 次の作業候補

1. 残り59地点の位置確認
2. 標高の付与
3. 国交省カメラの個別画像URL調査
4. NEXCO中日本カメラのWebMap連携方式調査
5. 霧確認モード（標高順比較）
6. お気に入り / 現場前チェックプリセット
7. 静岡県高解像度DEMへの3D地形差替え
