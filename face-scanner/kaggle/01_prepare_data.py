# Paste into Kaggle notebook cells. Run: !pip install facenet-pytorch --no-deps -q
import os, cv2, glob, torch
from PIL import Image
from facenet_pytorch import MTCNN

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(device, os.listdir('/kaggle/input'))   # confirm your dataset name

VIDEO_ROOT = '/kaggle/input/YOUR-DATASET-NAME/videos'
OUT_ROOT = '/kaggle/working/faces'
EVERY_N = 6   # keep 1 of every 6 frames

mtcnn = MTCNN(image_size=224, margin=30, post_process=False,
              select_largest=True, device=device)

for split in ['train', 'val']:
    for vid_path in glob.glob(f'{VIDEO_ROOT}/{split}/*.mp4'):
        person = os.path.splitext(os.path.basename(vid_path))[0]
        out_dir = f'{OUT_ROOT}/{split}/{person}'
        os.makedirs(out_dir, exist_ok=True)

        cap, i, saved = cv2.VideoCapture(vid_path), 0, 0
        while True:
            ok, frame = cap.read()
            if not ok: break
            if i % EVERY_N == 0:
                img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                face = mtcnn(img, save_path=f'{out_dir}/{i:05d}.jpg')
                if face is not None: saved += 1
            i += 1
        cap.release()
        print(split, person, saved, 'faces')
