# Azure VM 백엔드 배포

Azure Linux VM에서 `docker-compose.azure.yml`로 PostGIS DB와 FastAPI
백엔드만 실행한다. HTTPS가 필요하면 별도 `docker-compose.https.yml`이
기존 API 호스트 포트 3000에 연결된다.

원천 데이터 적재와 geocoding은 운영 컨테이너에 포함하지 않고
`docker-compose.seed.yml`의 일회성 컨테이너로 실행한다. 이 이미지에만
GDAL/`ogr2ogr`와 ETL 스크립트가 포함된다.

```text
Internet :3000
      |
FastAPI container
      |
Docker private network
      |
PostGIS container
```

## 포트

- API: VM의 `0.0.0.0:3000`에서 공개
- DB: VM 내부의 `127.0.0.1:5433`에만 공개
- 컨테이너 사이 DB 연결: `db:5432`

HTTP로 직접 시험할 때는 Azure NSG에서 API 3000을 제한적으로 허용한다.
별도 HTTPS 스택을 사용하면 80/443만 허용하고 3000과 DB 포트 5433은
인터넷에 열지 않는다.

## 환경파일

```bash
cp .env.azure.example .env.azure
chmod 600 .env.azure
nano .env.azure
```

반드시 변경할 값:

- `POSTGRES_PASSWORD`
- `DATABASE_URL` 안의 동일한 비밀번호
- `FRONTEND_ORIGINS`
- `FRONTEND_URL`

API는 컨테이너이므로 `DATABASE_URL`의 호스트는 `localhost`가 아니라 `db`다.
호스트 VM에서 DB 도구를 실행할 때만 `localhost:5433`을 사용한다.

## 로컬 빌드 이미지를 VM에서 실행

로컬에서 만든 이미지를 VM에 전송한 후:

```bash
docker load -i ~/dive2026-api-azure.tar

cd ~/dive_2026
docker compose \
  --env-file .env.azure \
  -f docker-compose.azure.yml \
  up -d --no-build
```

API 컨테이너가 시작될 때 `alembic upgrade head`를 실행한 후 Uvicorn을
시작한다.

## 데이터 이미지 빌드

seed 이미지는 로컬에서 x64 Linux 이미지로 빌드하고 API 이미지와 함께
VM으로 전달할 수 있다.

```powershell
docker buildx build `
  --platform linux/amd64 `
  -f .\api\Dockerfile.seed `
  -t dive2026-seed:azure `
  --load .\api

docker save -o dive2026-seed-azure.tar dive2026-seed:azure
```

VM에서:

```bash
docker load -i ~/dive2026-seed-azure.tar
```

## 확인

```bash
docker compose --env-file .env.azure -f docker-compose.azure.yml ps
docker compose --env-file .env.azure -f docker-compose.azure.yml logs --tail=100 db api
curl http://127.0.0.1:3000/health
```

외부에서는 다음 주소로 확인한다.

```text
http://VM_공인_IP:3000/health
```

## 선택: 별도 HTTPS 서비스 연결

백엔드 Compose를 그대로 실행한 상태에서 별도 HTTPS Compose를 시작한다.
이 스택의 Nginx는 `host.docker.internal:3000`을 통해 기존 API 포트에
연결한다.

`.env.azure`에 Azure 공인 IP의 정확한 FQDN과 이메일을 설정한다.

```env
API_DOMAIN=dive20261-api.koreacentral.cloudapp.azure.com
API_UPSTREAM=host.docker.internal:3000
CERTBOT_EMAIL=admin@example.com
```

DNS가 VM 공인 IP를 가리키고 Azure NSG의 80/443이 열린 상태에서 실행한다.

```bash
docker compose \
  --env-file .env.azure \
  -f docker-compose.https.yml \
  up -d
```

확인:

```bash
docker compose --env-file .env.azure -f docker-compose.https.yml ps
docker compose --env-file .env.azure -f docker-compose.https.yml logs --tail=100 nginx certbot-init certbot
curl "https://${API_DOMAIN}/health"
```

## 원천 데이터 적재

VM의 프로젝트 루트에 압축을 푼 `samples/`를 둔다.

```text
~/dive_2026/
├── docker-compose.azure.yml
├── docker-compose.seed.yml
├── .env.azure
└── samples/
    ├── housing/
    ├── poi/
    └── gis/
```

마커 파일과 이미지 내부 GDAL을 확인한다.

```bash
test -f samples/housing/purchased_units.csv

docker compose \
  --env-file .env.azure \
  -f docker-compose.azure.yml \
  -f docker-compose.seed.yml \
  run --rm seed ogr2ogr --version
```

초기 데이터 적재:

```bash
docker compose \
  --env-file .env.azure \
  -f docker-compose.azure.yml \
  -f docker-compose.seed.yml \
  run --rm seed
```

주택 geocoding:

```bash
docker compose \
  --env-file .env.azure \
  -f docker-compose.azure.yml \
  -f docker-compose.seed.yml \
  run --rm geocode
```

`seed`는 `housing_unit`, `housing_price`, `commercial_poi`와 GIS 테이블을
비우고 다시 적재한다. 자동 배포나 일반 `up`에 연결하지 말고 초기 적재 또는
명시적인 데이터 교체 때만 실행한다. `geocode`는 좌표가 없는 주택만 처리한다.

정상 적재 확인:

```bash
docker compose \
  --env-file .env.azure \
  -f docker-compose.azure.yml \
  exec db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT
      (SELECT count(*) FROM commercial_poi) AS poi,
      (SELECT count(*) FROM admin_boundary) AS boundaries,
      (SELECT count(*) FROM commercial_zone) AS zones,
      (SELECT count(*) FROM building) AS buildings;
  "'
```

## 데이터 보존

named volume `dive_pg_data`가 DB 데이터를 유지한다. 새 VM에서는 빈 DB가
생성되므로 seed 컨테이너로 원천 데이터를 적재하거나 `pg_dump` 파일을
복원해야 한다.

`docker compose down`은 volume을 보존하지만 `docker compose down -v`는
운영 DB를 삭제하므로 사용하지 않는다.
