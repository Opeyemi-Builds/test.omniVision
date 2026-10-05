import torch, torch.nn as nn
from torchvision import models, transforms

device = 'cuda' if torch.cuda.is_available() else 'cpu'

ckpt = torch.load('face_resnet18.pth', map_location=device)
classes = ckpt['classes']

model = models.resnet18()
model.fc = nn.Linear(model.fc.in_features, len(classes))  # same architecture as training
model.load_state_dict(ckpt['state_dict'])
model.to(device).eval()


preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
