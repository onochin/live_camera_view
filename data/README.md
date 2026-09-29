# data ディレクトリ

静岡県東部の道路ライブカメラ WebMap 用の元データを管理する。

## ファイル

- `camera_sources.csv`
  - 公式公開元の台帳
  - 管理主体・事務所・公開方式・公式URLを管理
- `camera_inventory.csv`
  - Step 1で整理した既存カメラ台帳
  - 2026-09-29 時点で68件を収録
- `camera_inventory_additional.csv`
  - v0.3で追加した天城北道路8地点の台帳
- `cameras.geojson`
  - v0.2までのWebMap表示データ
- `cameras_additional.json`
  - v0.3で追加した31地点
  - 国道1号箱根峠13、国道138号須走3、国道246号小山7、天城北道路8

登録カメラは `camera_inventory.csv` 68件 + `camera_inventory_additional.csv` 8件 = **76件**。
NEXCO中日本の4地点はiHighwayへの代表リンク地点であり、このカメラ件数には含めない。

## 主な項目

| 項目 | 内容 |
|---|---|
| `camera_id` | WebMap内で使用する一意ID |
| `provider` | 管理主体 |
| `office` | 土木事務所・河川国道事務所等 |
| `route_type` | 国道・主要地方道・一般県道・有料道路等 |
| `route_no` | 路線番号 |
| `route_name` | 路線名 |
| `camera_name` | カメラ名称 |
| `area` | WebMap用の大まかな地域分類 |
| `municipality` | 市町村 |
| `km_point` | 国交省カメラ等のKP |
| `lat` / `lon` | 緯度経度 |
| `elevation_m` | 標高 |
| `camera_url` | カメラ表示先 |
| `source_url` | 公式一覧・出典ページ |
| `display_type` | `direct_image` / `page` / `group_page` / `external_link` |
| `geo_status` | 位置確定状況 |
| `checked_at` | 最終確認日 |

## WebMap上の位置区分

- `〇 座標位置`
  - 峠・施設等の位置を比較的明確に確認できたもの
- `□ 近傍`
  - 距離標・地名・道路線形・IC・構造物等を基に置いた代表位置
  - カメラ支柱そのものの正確な座標とは限らない

## 方針

- カメラ画像そのものはリポジトリへ保存しない。
- 公開元の公式URL・個別JPEG URLを参照する。
- WebMapに置く位置がカメラ支柱位置と断定できない場合は `□ 近傍` として明示する。
- NEXCO中日本はiHighwayの動的サービスとして扱い、カメラ支柱ではなく代表リンク地点を表示する。
- 近傍位置は今後、公開資料等から位置を精査できたものから更新する。
