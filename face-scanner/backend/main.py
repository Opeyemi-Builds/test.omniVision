import io
import torch
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from facenet_pytorch import MTCNN
from model_loader import model, classes, preprocess, device

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])

mtcnn = MTCNN(image_size=224, margin=30, post_process=False,
              select_largest=True, device=device)

@app.post("/getface")
async def getface(file: UploadFile = File(...)):
    img = Image.open(io.BytesIO(await file.read())).convert("RGB")

    face = mtcnn(img)                      # same crop as training
    if face is None:
        return {"face_found": False}

    face_img = Image.fromarray(face.permute(1, 2, 0).byte().numpy())
    x = preprocess(face_img).unsqueeze(0).to(device)

    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)[0]
    conf, idx = probs.max(0)

    name = classes[idx.item()]
    if conf.item() < 0.80 or name == "unknown":   # tune this threshold
        name = "unknown"

    return {"face_found": True, "name": name, "confidence": round(conf.item(), 3)}
