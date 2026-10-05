# Face Scanner

```
face-scanner/
  kaggle/     data prep script (videos -> cropped faces). Training notebook still to be written.
  backend/    FastAPI + PyTorch (/getface). Needs face_resnet18.pth from your Kaggle training.
  frontend/   React + TypeScript sci-fi scanner (camera or upload)
```

## Frontend
cd frontend && npm install && npm run dev

## Backend
cd backend
pip install -r requirements.txt
pip install facenet-pytorch --no-deps
# put face_resnet18.pth in this folder
uvicorn main:app --reload
