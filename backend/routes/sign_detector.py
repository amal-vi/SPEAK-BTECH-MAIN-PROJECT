import torch
import cv2
import numpy as np
import base64
import sys
import os
import albumentations as A
from albumentations.pytorch import ToTensorV2



current_dir = os.path.dirname(os.path.abspath(__file__))

ai_folder = os.path.join(os.path.dirname(current_dir), 'ai') 

try:
    from ai.model import DETR
    from ai.utils.setup import get_classes
except ImportError as e:
    print(f"❌ Error importing AI model files: {e}")
    print(f"   Ensure 'model.py' and 'utils/' are inside '{ai_folder}'")
    DETR = None

class SignDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.classes = []
        self.transform = None
        
        
        self.model_path = os.path.join(ai_folder, '99_model.pt')

        self.load_model()

    def load_model(self):
        if not DETR: return

        print(f"🔄 Loading Sign Language Model from {self.model_path}...")
        try:
            # 1. Initialize Model 
            # Update this number if your 99_model.pt has more classes!
            self.model = DETR(num_classes=3) 
            self.model.eval()
            
            # 2. Load Weights
            checkpoint = torch.load(self.model_path, map_location=self.device)
            self.model.load_state_dict(checkpoint)
            self.model.to(self.device)
            
            # 3. Setup Classes
            # try:
            #     self.classes = get_classes()
            # except:
            #     self.classes = ['Class1', 'Class2', 'Class3'] 
            self.classes = ['Hello', 'I Love You', 'Thank You']

            # 4. Setup Transforms (Standard for DETR)
            self.transform = A.Compose([
                A.Resize(224, 224),
                A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                ToTensorV2()
            ])
            
            print("✅ Sign Language Model Loaded Successfully")
        except Exception as e:
            print(f"❌ Failed to load model: {e}")

    def predict(self, base64_image):
        if not self.model: return None

        try:
            # Decode Base64 -> OpenCV Image
            if "base64," in base64_image:
                base64_image = base64_image.split("base64,")[1]
            image_bytes = base64.b64decode(base64_image)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None: return None

            # Preprocess
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            transformed = self.transform(image=frame_rgb)
            img_tensor = transformed['image'].unsqueeze(0).to(self.device)

            # Inference
            with torch.no_grad():
                result = self.model(img_tensor)

            # Post-Processing
            probabilities = result['pred_logits'].softmax(-1)[0, :, :-1]
            max_probs, max_classes = probabilities.max(-1)
            
            # Confidence Threshold 0.8
            keep_mask = max_probs > 0.8
            
            if keep_mask.any():
                best_idx = max_probs.argmax()
                if max_probs[best_idx] > 0.8:
                    class_id = max_classes[best_idx].item()
                    # Safety check for class index
                    if class_id < len(self.classes):
                        return self.classes[class_id]
            
            return None

        except Exception as e:
            print(f"Prediction Error: {e}")
            return None

# Singleton Instance
detector = SignDetector()