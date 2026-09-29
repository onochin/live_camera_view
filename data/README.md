# data ディレクトリ

静岡県東部の道路ライブカメラ WebMap 用の元データを管理する。

## ファイル

- `camera_sources.csv`
  - 公式公開元の台帳
  - 管理主体・事務所・公開方式・公式URLを管理
- `camera_inventory.csv`
  - 個別カメラ台帳
  - 2026-09-29 時点で、公式一覧から確認できた道路カメラ 68件を収録

## camera_inventory.csv の主な項目

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
| `municipality` | 市町村。公式情報だけでは確定できないものは空欄 |
| `km_point` | 国交省カメラ等のKP |
| `lat` / `lon` | 緯度経度。未確定は空欄 |
| `elevation_m` | 標高。未確定は空欄 |
| `camera_url` | カメラ表示先。直接画像・個別ページ・路線別ページのいずれか |
| `source_url` | 公式一覧・出典ページ |
| `display_type` | `direct_image` / `page` / `group_page` |
| `geo_status` | 位置確定状況 |
| `elevation_status` | 標高確定状況 |
| `checked_at` | 最終確認日 |

## 方針

- カメラ画像そのものはリポジトリへ保存しない。
- 原則として公式公開元への参照のみを保持する。
- 直リンク可否・再配信可否が不明な公開元については、WebMapから公式ページを開く方式を優先する。
- NEXCO中日本は iHighway の動的サービスとして扱い、初期版では個別カメラURLを固定しない。
- 緯度経度・標高は、次の作業で出典を明確にしたうえで付与する。推測値を正本にしない。
