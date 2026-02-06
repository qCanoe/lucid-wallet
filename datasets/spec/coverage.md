# Coverage Matrix

This document defines the minimum coverage requirements for dataset samples.

## Dimensions

* `task_type`: `send` / `swap`
* `level`: `easy` / `medium` / `hard`
* `chain_id`: `1` / `11155111` / `137` / `42161`

## Minimum samples per combination

* Each `task_type` × `level` × `chain_id` cell must contain **at least 5 samples**.
* Total minimum samples implied by the matrix: 2 × 3 × 4 × 5 = **120 samples**.

## Failure sample ratio target

* Failure samples should account for **20%–30%** of total samples **within each cell**.
* If a cell has the minimum 5 samples, target **1–2** failure samples in that cell.

## Coverage matrix

| task_type | level  | chain_id | Minimum samples | Failure ratio target |
|-----------|--------|----------|-----------------|----------------------|
| send      | easy   | 1        | ≥5              | 20%–30%              |
| send      | easy   | 11155111 | ≥5              | 20%–30%              |
| send      | easy   | 137      | ≥5              | 20%–30%              |
| send      | easy   | 42161    | ≥5              | 20%–30%              |
| send      | medium | 1        | ≥5              | 20%–30%              |
| send      | medium | 11155111 | ≥5              | 20%–30%              |
| send      | medium | 137      | ≥5              | 20%–30%              |
| send      | medium | 42161    | ≥5              | 20%–30%              |
| send      | hard   | 1        | ≥5              | 20%–30%              |
| send      | hard   | 11155111 | ≥5              | 20%–30%              |
| send      | hard   | 137      | ≥5              | 20%–30%              |
| send      | hard   | 42161    | ≥5              | 20%–30%              |
| swap      | easy   | 1        | ≥5              | 20%–30%              |
| swap      | easy   | 11155111 | ≥5              | 20%–30%              |
| swap      | easy   | 137      | ≥5              | 20%–30%              |
| swap      | easy   | 42161    | ≥5              | 20%–30%              |
| swap      | medium | 1        | ≥5              | 20%–30%              |
| swap      | medium | 11155111 | ≥5              | 20%–30%              |
| swap      | medium | 137      | ≥5              | 20%–30%              |
| swap      | medium | 42161    | ≥5              | 20%–30%              |
| swap      | hard   | 1        | ≥5              | 20%–30%              |
| swap      | hard   | 11155111 | ≥5              | 20%–30%              |
| swap      | hard   | 137      | ≥5              | 20%–30%              |
| swap      | hard   | 42161    | ≥5              | 20%–30%              |

## Acceptance checklist

* [ ] Every `task_type` × `level` × `chain_id` cell has **≥5 samples**.
* [ ] Each cell has a failure sample ratio within **20%–30%**.
* [ ] Total samples across all cells **≥120**.
* [ ] Failure samples are labeled consistently with the dataset spec.
* [ ] Metadata for each sample includes `task_type`, `level`, and `chain_id`.
