"""
Training Script for Crop Disease Detection (30 Classes)
Dataset: PlantDisease416x416 (train: 2328 images, test: 239 images)
Model: MobileNetV3-Small (Transfer Learning with PyTorch)
Output: ml_backend/models/crop_disease_mobilenet.pth & crop_disease_knowledge.json
"""

import os
import sys
import glob
import json
import time
from collections import Counter
from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models

# 1. Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "datasets", "crop-diseases", "PlantDisease416x416")
TRAIN_DIR = os.path.join(DATASET_DIR, "train")
TEST_DIR = os.path.join(DATASET_DIR, "test")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "crop_disease_mobilenet.pth")
KNOWLEDGE_SAVE_PATH = os.path.join(MODELS_DIR, "crop_disease_knowledge.json")
METRICS_SAVE_PATH = os.path.join(MODELS_DIR, "crop_disease_metrics.json")

# 2. Labels & Agronomic Knowledge Base (30 Classes)
CLASS_NAMES = [
    "Apple Scab Leaf",
    "Apple leaf",
    "Apple rust leaf",
    "Bell_pepper leaf",
    "Bell_pepper leaf spot",
    "Blueberry leaf",
    "Cherry leaf",
    "Corn Gray leaf spot",
    "Corn leaf blight",
    "Corn rust leaf",
    "Peach leaf",
    "Potato leaf",
    "Potato leaf early blight",
    "Potato leaf late blight",
    "Raspberry leaf",
    "Soyabean leaf",
    "Soybean leaf",
    "Squash Powdery mildew leaf",
    "Strawberry leaf",
    "Tomato Early blight leaf",
    "Tomato Septoria leaf spot",
    "Tomato leaf",
    "Tomato leaf bacterial spot",
    "Tomato leaf late blight",
    "Tomato leaf mosaic virus",
    "Tomato leaf yellow virus",
    "Tomato mold leaf",
    "Tomato two spotted spider mites leaf",
    "grape leaf",
    "grape leaf black rot"
]

DISEASE_KNOWLEDGE = {
    "Apple Scab Leaf": {
        "crop": "Apple (सेब)",
        "disease": "Apple Scab (सेब का स्कैब / पपड़ी रोग)",
        "is_healthy": False,
        "severity": "Moderate to High",
        "symptoms": "Olive-green to velvety brown spots on leaves, becoming corky and causing premature leaf drop. (पत्तियों पर जैतूनी हरे धब्बे जो बाद में भूरे और पपड़ीदार हो जाते हैं)",
        "chemical_treatment": "Spray Captan 50% WP @ 2.5g/L or Mancozeb 75% WP @ 2.5g/L at green tip and petal fall stages.",
        "organic_treatment": "Neem oil spray (5ml/L), dormant copper spray (3g/L) before bud break, remove fallen leaves.",
        "prevention": "Prune tree canopies to improve air circulation and sunlight penetration; rake and burn infected fallen leaves."
    },
    "Apple leaf": {
        "crop": "Apple (सेब)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Lush green, glossy leaf surface without any lesions or discoloration.",
        "chemical_treatment": "No chemical treatment required.",
        "organic_treatment": "Regular foliar seaweed extract or compost tea spray for immunity.",
        "prevention": "Maintain balanced N-P-K nutrition and adequate orchard drainage."
    },
    "Apple rust leaf": {
        "crop": "Apple (सेब)",
        "disease": "Cedar Apple Rust (सेब का गेरुई / रतुआ रोग)",
        "is_healthy": False,
        "severity": "Moderate",
        "symptoms": "Bright yellow-orange circular spots on upper leaf surface, producing rust-like fungal tubes beneath. (पत्तियों पर चमकीले नारंगी-पीले धब्बे)",
        "chemical_treatment": "Spray Myclobutanil 10% WP @ 1g/L or Mancozeb @ 2.5g/L at pink bud stage.",
        "organic_treatment": "Sulfur-based organic fungicide dust (2g/L) or Copper soap spray.",
        "prevention": "Remove nearby wild juniper/cedar host trees within 500 meters of the orchard."
    },
    "Bell_pepper leaf": {
        "crop": "Bell Pepper (शिमला मिर्च)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Uniform deep green foliage, crisp leaf margin with healthy venation.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Neem cake soil application (50g/plant) as preventative repellent.",
        "prevention": "Ensure good soil aeration and avoid over-irrigation."
    },
    "Bell_pepper leaf spot": {
        "crop": "Bell Pepper (शिमला मिर्च)",
        "disease": "Bacterial Leaf Spot (जीवाणु पत्ती धब्बा रोग)",
        "is_healthy": False,
        "severity": "High",
        "symptoms": "Small, water-soaked, dark brown angular spots with yellow halos. (पत्तियों पर पानी जैसे धब्बे जो बाद में भूरे हो जाते हैं)",
        "chemical_treatment": "Spray Copper Oxychloride 50% WP @ 2.5g/L + Streptocycline @ 0.5g/10L.",
        "organic_treatment": "Pseudomonas fluorescens foliar spray @ 5g/L; avoid overhead sprinkler irrigation.",
        "prevention": "Use certified disease-free seeds; practice 2-year crop rotation without Solanaceous crops."
    },
    "Blueberry leaf": {
        "crop": "Blueberry (ब्लूबेरी)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Healthy dark green, smooth leaves with intact cuticle layer.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Pine needle mulch to maintain acidic soil pH (4.5 - 5.2).",
        "prevention": "Maintain acidic soil conditions and steady drip moisture."
    },
    "Cherry leaf": {
        "crop": "Cherry (चेरी)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Vibrant green leaves, uniform shape, free of shot-hole spots or curling.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Organic kelp extract spray during flower set.",
        "prevention": "Ensure canopy aeration and adequate drainage in temperate slopes."
    },
    "Corn Gray leaf spot": {
        "crop": "Corn / Maize (मक्का)",
        "disease": "Gray Leaf Spot (ग्रे लीफ स्पॉट / धूसर पत्ती धब्बा)",
        "is_healthy": False,
        "severity": "Moderate to High",
        "symptoms": "Rectangular, brown to gray lesions running parallel between leaf veins. (नसों के बीच आयताकार धूसर धब्बे)",
        "chemical_treatment": "Spray Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1ml/L or Carbendazim @ 1g/L.",
        "organic_treatment": "Trichoderma harzianum soil and foliar spray @ 5g/L.",
        "prevention": "Crop rotation with legumes; plow under crop residue after harvest to destroy fungal spores."
    },
    "Corn leaf blight": {
        "crop": "Corn / Maize (मक्का)",
        "disease": "Northern Corn Leaf Blight (मक्का झुलसा रोग)",
        "is_healthy": False,
        "severity": "High",
        "symptoms": "Long, cigar-shaped grayish-green to tan lesions on lower leaves progressing upwards. (सिगार के आकार के बड़े धब्बे)",
        "chemical_treatment": "Spray Mancozeb 75% WP @ 2.5g/L or Propiconazole 25% EC @ 1ml/L at disease onset.",
        "organic_treatment": "Neem kernel aqueous extract (5%) spray at 10-day intervals.",
        "prevention": "Plant resistant hybrid seeds (e.g. Ganga-5, Vivek Hybrid); avoid high plant density."
    },
    "Corn rust leaf": {
        "crop": "Corn / Maize (मक्का)",
        "disease": "Common Corn Rust (मक्का का रतुआ रोग)",
        "is_healthy": False,
        "severity": "Moderate",
        "symptoms": "Cinnamon-brown powdery pustules scattered on both upper and lower leaf surfaces. (पत्तियों पर कत्थई रंग के उभरे हुए दाने/फुंसियां)",
        "chemical_treatment": "Spray Tebuconazole 25.9% EC @ 1ml/L or Mancozeb @ 2.5g/L.",
        "organic_treatment": "Sulfur 80% WDG @ 2g/L; spray in cool morning hours.",
        "prevention": "Plant early in the season to escape mid-monsoon peak fungal humidity."
    },
    "Peach leaf": {
        "crop": "Peach (आड़ू)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Clean, lance-shaped bright green leaves with serrated margins.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Dormant Bordeaux mixture spray (1%) in winter for preventative care.",
        "prevention": "Monitor for aphid infestation in early spring."
    },
    "Potato leaf": {
        "crop": "Potato (आलू)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Compound green foliage, no curling, yellowing, or necrotic margins.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Foliar vermiwash spray (10%) for vigor and vitality.",
        "prevention": "Use certified seed tubers (Kufri Jyoti/Giriraj) and earth up ridges properly."
    },
    "Potato leaf early blight": {
        "crop": "Potato (आलू)",
        "disease": "Potato Early Blight (आलू का अगेती झुलसा)",
        "is_healthy": False,
        "severity": "Moderate to High",
        "symptoms": "Target-board circular dark brown spots with concentric rings on older leaves. (पत्तियों पर छल्लेदार गोल कत्थई धब्बे - Target board effect)",
        "chemical_treatment": "Spray Mancozeb 75% WP @ 2.5g/L or Chlorothalonil 75% WP @ 2g/L at 7-10 day intervals.",
        "organic_treatment": "Trichoderma viride foliar spray @ 5g/L; copper hydroxide @ 2g/L.",
        "prevention": "Avoid excess nitrogen fertilizer; maintain optimal potassium and drip irrigate in morning."
    },
    "Potato leaf late blight": {
        "crop": "Potato (आलू)",
        "disease": "Potato Late Blight (आलू का पछेती झुलसा - Phytophthora)",
        "is_healthy": False,
        "severity": "Critical / Severe",
        "symptoms": "Water-soaked dark lesions rapidly turning black with white cottony fungal mold on leaf underside under cool humid weather. (पत्तियों पर तेजी से काले होते धब्बे और नीचे सफेद फफूंद)",
        "chemical_treatment": "Immediate spray of Cymoxanil 8% + Mancozeb 64% WP (Curzate) @ 3g/L or Metalaxyl-M + Mancozeb (Ridomil Gold) @ 2.5g/L.",
        "organic_treatment": "Bordeaux mixture (1%) or Copper Oxychloride 50% WP @ 3g/L before rain; destroy blighted haulms.",
        "prevention": "Plant resistant cultivars (Kufri Girdhari, Kufri Himalini); spray prophylactic mancozeb before foggy cold wave."
    },
    "Raspberry leaf": {
        "crop": "Raspberry (रसभरी)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Healthy serrated composite leaves with pale silver underside.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Compost mulch and organic bio-fertilizer application.",
        "prevention": "Maintain trellising to keep canes upright and well aerated."
    },
    "Soyabean leaf": {
        "crop": "Soybean (सोयाबीन)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Trifoliate lush green leaves with clean veins.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Rhizobium leguminosarum seed inoculation.",
        "prevention": "Ensure good drainage to avoid collar rot."
    },
    "Soybean leaf": {
        "crop": "Soybean (सोयाबीन)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Healthy deep green trifoliate foliage without yellow mosaic.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Neem oil spray (3ml/L) as insect deterrent.",
        "prevention": "Practice crop rotation with wheat/barley."
    },
    "Squash Powdery mildew leaf": {
        "crop": "Squash / Pumpkin (कद्दू / तोरी)",
        "disease": "Powdery Mildew (चूर्णिल आसिता / सफेद फफूंद)",
        "is_healthy": False,
        "severity": "Moderate to High",
        "symptoms": "White talcum-powder-like fungal patches on leaf surface, causing yellowing and premature drying. (पत्तियों पर सफेद पाउडर जैसे धब्बे)",
        "chemical_treatment": "Spray Hexaconazole 5% EC @ 1ml/L or Difenoconazole 25% EC @ 0.5ml/L or Wettable Sulfur 80% @ 2g/L.",
        "organic_treatment": "Milk-water spray (1:9 ratio) or potassium bicarbonate (3g/L) + Neem oil (5ml/L).",
        "prevention": "Water at the soil base only; space vines generously to allow air movement."
    },
    "Strawberry leaf": {
        "crop": "Strawberry (स्ट्रॉबेरी)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Healthy three-leaflet deep green foliage with bright saw-toothed margins.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Straw mulching to keep leaves off damp soil.",
        "prevention": "Use drip tape beneath black plastic mulch."
    },
    "Tomato Early blight leaf": {
        "crop": "Tomato (टमाटर)",
        "disease": "Tomato Early Blight (टमाटर का अगेती झुलसा - Alternaria)",
        "is_healthy": False,
        "severity": "High",
        "symptoms": "Brown to black spots with concentric rings surrounded by yellow chlorotic margins on lower leaves. (निचली पत्तियों पर गोल छल्लेदार काले-भूरे धब्बे)",
        "chemical_treatment": "Spray Mancozeb 75% WP @ 2.5g/L or Azoxystrobin 23% SC @ 1ml/L at 7-10 day intervals.",
        "organic_treatment": "Neem seed kernel extract (5%) or Copper Hydroxide @ 2g/L; prune lower 12 inches of infected foliage.",
        "prevention": "Stake plants upright; mulch soil surface to prevent soil splash during rain."
    },
    "Tomato Septoria leaf spot": {
        "crop": "Tomato (टमाटर)",
        "disease": "Septoria Leaf Spot (सेप्टोरिया पत्ती धब्बा)",
        "is_healthy": False,
        "severity": "Moderate to High",
        "symptoms": "Numerous small circular spots (1-3mm) with gray/tan centers and dark brown borders with tiny black dots inside. (छोटे गोल धब्बे जिनके बीच का हिस्सा हल्का भूरा होता है)",
        "chemical_treatment": "Spray Chlorothalonil 75% WP @ 2g/L or Copper Oxychloride @ 3g/L.",
        "organic_treatment": "Bio-fungicide Bacillus subtilis foliar spray @ 5g/L.",
        "prevention": "Disinfect garden tools; avoid touching plants when foliage is wet."
    },
    "Tomato leaf": {
        "crop": "Tomato (टमाटर)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Vibrant emerald green, pinnate leaves with healthy trichomes (hairs) and fragrant aroma.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Panchagavya foliar spray (3%) every 15 days.",
        "prevention": "Maintain proper staking, trellising, and uniform moisture."
    },
    "Tomato leaf bacterial spot": {
        "crop": "Tomato (टमाटर)",
        "disease": "Bacterial Spot (टमाटर का जीवाणु धब्बा रोग)",
        "is_healthy": False,
        "severity": "High",
        "symptoms": "Small, dark, greasy water-soaked spots on leaves that turn brown-black and cause ragged holes. (छोटे चिकने काले धब्बे)",
        "chemical_treatment": "Spray Copper Oxychloride 50% WP @ 2.5g/L + Streptocycline @ 0.5g/10L water.",
        "organic_treatment": "Spray certified copper soap formulation; remove severely infected branches immediately.",
        "prevention": "Hot water seed treatment (50°C for 25 min); 3-year crop rotation away from solanaceous plants."
    },
    "Tomato leaf late blight": {
        "crop": "Tomato (टमाटर)",
        "disease": "Tomato Late Blight (टमाटर का पछेती झुलसा - Phytophthora)",
        "is_healthy": False,
        "severity": "Critical / Emergency",
        "symptoms": "Large, dark water-soaked greasy lesions turning papery brown, with white downy fungal fuzz under high humidity. (पत्तियों पर तेजी से फैलते काले-कत्थई गीले धब्बे)",
        "chemical_treatment": "Emergency spray of Dimethomorph 50% WP @ 1g/L + Mancozeb @ 2g/L OR Metalaxyl 8% + Mancozeb 64% WP @ 2.5g/L.",
        "organic_treatment": "Bordeaux mixture (1%) or Copper Hydroxide spray; destroy infected plants promptly.",
        "prevention": "Select tolerant varieties (e.g. Pant Bahar, Kashi Amrit); avoid overhead irrigation and dense planting."
    },
    "Tomato leaf mosaic virus": {
        "crop": "Tomato (टमाटर)",
        "disease": "Tomato Mosaic Virus - ToMV (टमाटर मोज़ेक वायरस)",
        "is_healthy": False,
        "severity": "High (Viral)",
        "symptoms": "Mottled light and dark green mosaic pattern on leaves, fern-like leaf distortion and stunting. (पत्तियों पर हल्के और गहरे हरे रंग के चितकबरे धब्बे और मुड़ाव)",
        "chemical_treatment": "No chemical cure for viral infections. Control insect vectors (aphids/thrips) with Imidacloprid 17.8% SL @ 0.5ml/L.",
        "organic_treatment": "Spray skimmed milk solution (10%) to neutralize mechanical virus transmission; rogue out infected plants.",
        "prevention": "Wash hands with soap before touching plants; smokers must avoid handling seedlings."
    },
    "Tomato leaf yellow virus": {
        "crop": "Tomato (टमाटर)",
        "disease": "Tomato Yellow Leaf Curl Virus - TYLCV (टमाटर पत्ती मरोड़ रोग)",
        "is_healthy": False,
        "severity": "High (Viral - Whitefly vector)",
        "symptoms": "Severe upward leaf curling, yellowing of leaf margins, stunted bushy plant growth with no fruit set. (पत्तियों का ऊपर की ओर मुड़ना, किनारों का पीला पड़ना)",
        "chemical_treatment": "Control Whitefly vector: Spray Diafenthiuron 50% WP @ 1g/L or Acetamiprid 20% SP @ 0.5g/L.",
        "organic_treatment": "Install yellow sticky traps (15 traps/acre); spray 5% Neem seed kernel extract (NSKE) weekly.",
        "prevention": "Cover seedling nursery with 40-mesh insect-proof nylon net."
    },
    "Tomato mold leaf": {
        "crop": "Tomato (टमाटर)",
        "disease": "Leaf Mold (पत्ती फफूंद / लीफ मोल्ड - Passalora)",
        "is_healthy": False,
        "severity": "Moderate",
        "symptoms": "Pale green or yellow spots on upper leaf surface, with dense olive-green to brown velvety mold on leaf underside. (पत्ती के निचले हिस्से पर मखमली जैतूनी फफूंद)",
        "chemical_treatment": "Spray Difenoconazole 25% EC @ 0.5ml/L or Chlorothalonil @ 2g/L.",
        "organic_treatment": "Spray baking soda solution (5g/L) + Neem oil (3ml/L); ventilate polyhouse greenhouse thoroughly.",
        "prevention": "Lower greenhouse relative humidity below 85%; space plants widely."
    },
    "Tomato two spotted spider mites leaf": {
        "crop": "Tomato (टमाटर)",
        "disease": "Two-Spotted Spider Mite Damage (लाल मकड़ी / माइट्स का प्रकोप)",
        "is_healthy": False,
        "severity": "High (Acarina pest)",
        "symptoms": "Fine yellow stippling/flecking on upper leaf surface, fine silken webbing on leaf undersides, leaves turning bronze. (पत्तियों पर बारीक पीले बिंदु और जाले)",
        "chemical_treatment": "Spray Spiromesifen 22.9% SC @ 1ml/L or Propargite 57% EC @ 2ml/L.",
        "organic_treatment": "Spray water jet to dislodge mites; apply Wettable Sulfur @ 2g/L or Neem oil (5ml/L).",
        "prevention": "Avoid drought stress and dusty conditions; introduce predatory mites (Phytoseiulus persimilis)."
    },
    "grape leaf": {
        "crop": "Grape (अंगूर)",
        "disease": "Healthy Leaf (स्वस्थ पत्ता)",
        "is_healthy": True,
        "severity": "None",
        "symptoms": "Broad, palmately lobed green leaves with healthy veins and smooth texture.",
        "chemical_treatment": "No treatment required.",
        "organic_treatment": "Balanced micronutrient zinc and boron spray before flowering.",
        "prevention": "Proper canopy shoot thinning and trellis management."
    },
    "grape leaf black rot": {
        "crop": "Grape (अंगूर)",
        "disease": "Grape Black Rot (अंगूर का काला सड़न रोग - Guignardia)",
        "is_healthy": False,
        "severity": "High",
        "symptoms": "Small, reddish-brown circular spots on leaves with dark borders and tiny black fruiting pycnidia inside. (पत्तियों पर लाल-भूरे गोल धब्बे)",
        "chemical_treatment": "Spray Mancozeb 75% WP @ 2.5g/L or Tebuconazole 25% EC @ 1ml/L starting at early shoot development.",
        "organic_treatment": "Copper soap spray (3g/L); remove and destroy mummified berries and infected canes.",
        "prevention": "Prune grapevines to maximize solar exposure and air movement; bury infected vine refuse."
    }
}


# 3. Custom PyTorch Dataset
class CropDiseaseDataset(Dataset):
    def __init__(self, folder_dir, transform=None):
        self.folder_dir = folder_dir
        self.transform = transform
        self.samples = []
        
        # Match jpg with txt
        jpg_files = glob.glob(os.path.join(folder_dir, "*.jpg")) + glob.glob(os.path.join(folder_dir, "*.png"))
        for img_path in jpg_files:
            base_name = os.path.splitext(img_path)[0]
            txt_path = base_name + ".txt"
            
            label_id = None
            if os.path.exists(txt_path):
                try:
                    with open(txt_path, 'r') as f:
                        lines = [l.strip() for l in f if l.strip()]
                        if lines:
                            # Pick dominant class in file
                            class_ids = [int(line.split()[0]) for line in lines if line.split()]
                            if class_ids:
                                label_id = Counter(class_ids).most_common(1)[0][0]
                except Exception:
                    pass
            
            # Keep sample if valid label (0 to 29)
            if label_id is not None and 0 <= label_id < 30:
                self.samples.append((img_path, label_id))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, label


def main():
    print("=" * 65)
    print("[*] KISANSAATHI AI - PLANT DISEASE DETECTION TRAINING")
    print("=" * 65)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Hardware Device: {device}")
    
    # 4. Transforms
    train_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    test_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # 5. Load Data
    print(f"Loading Train Dataset from: {TRAIN_DIR}")
    train_dataset = CropDiseaseDataset(TRAIN_DIR, transform=train_transforms)
    print(f"  -> Valid Train samples: {len(train_dataset)}")
    
    print(f"Loading Test Dataset from: {TEST_DIR}")
    test_dataset = CropDiseaseDataset(TEST_DIR, transform=test_transforms)
    print(f"  -> Valid Test samples: {len(test_dataset)}")
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)
    
    # 6. Model Architecture (MobileNetV3-Small)
    print("\nInitializing Pretrained MobileNetV3-Small...")
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    
    # Replace final classifier layer with 30 disease classes
    num_classes = len(CLASS_NAMES)
    in_features = model.classifier[0].in_features
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 256),
        nn.Hardswish(),
        nn.Dropout(p=0.25),
        nn.Linear(256, num_classes)
    )
    
    model = model.to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.0008, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=2, gamma=0.5)
    
    epochs = 4
    print(f"\nStarting Model Training for {epochs} Epochs...")
    start_time = time.time()
    
    best_test_acc = 0.0
    epoch_history = []
    
    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct_train += (preds == labels).sum().item()
            total_train += labels.size(0)
            
            if (batch_idx + 1) % 25 == 0 or (batch_idx + 1) == len(train_loader):
                print(f"  Epoch [{epoch}/{epochs}] Batch [{batch_idx+1}/{len(train_loader)}] "
                      f"Batch Loss: {loss.item():.4f}")
        
        train_loss = running_loss / total_train
        train_acc = (correct_train / total_train) * 100.0
        
        # Evaluation on Test Set
        model.eval()
        test_loss = 0.0
        correct_test = 0
        total_test = 0
        
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                test_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                correct_test += (preds == labels).sum().item()
                total_test += labels.size(0)
        
        test_loss = test_loss / total_test
        test_acc = (correct_test / total_test) * 100.0 if total_test > 0 else 0.0
        epoch_dur = time.time() - epoch_start
        scheduler.step()
        
        print(f"\n>>> Epoch {epoch}/{epochs} Complete in {epoch_dur:.1f}s | "
              f"Train Acc: {train_acc:.2f}% | Test Acc: {test_acc:.2f}% | "
              f"Test Loss: {test_loss:.4f}\n")
        
        epoch_history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 2),
            "test_loss": round(test_loss, 4),
            "test_acc": round(test_acc, 2),
            "duration_sec": round(epoch_dur, 1)
        })
        
        if test_acc >= best_test_acc:
            best_test_acc = test_acc
            print(f"Saving checkpoint (Accuracy: {test_acc:.2f}%)...")
            torch.save({
                'model_state_dict': model.state_dict(),
                'class_names': CLASS_NAMES,
                'num_classes': num_classes,
                'test_acc': test_acc,
                'architecture': 'mobilenet_v3_small'
            }, MODEL_SAVE_PATH)
    
    total_time = time.time() - start_time
    print(f"\n[OK] Training Finished in {total_time/60:.2f} mins. Peak Test Accuracy: {best_test_acc:.2f}%")
    print(f"Model saved to: {MODEL_SAVE_PATH}")
    
    # 7. Save Knowledge JSON & Metrics JSON
    with open(KNOWLEDGE_SAVE_PATH, 'w', encoding='utf-8') as f:
        json.dump({
            "model": "KisanSaathi Crop Disease AI",
            "architecture": "MobileNetV3-Small",
            "num_classes": len(CLASS_NAMES),
            "class_names": CLASS_NAMES,
            "diseases": DISEASE_KNOWLEDGE
        }, f, indent=2, ensure_ascii=False)
    print(f"Knowledge base saved to: {KNOWLEDGE_SAVE_PATH}")
    
    with open(METRICS_SAVE_PATH, 'w', encoding='utf-8') as f:
        json.dump({
            "model_type": "MobileNetV3-Small PyTorch",
            "epochs": epochs,
            "best_test_accuracy": round(best_test_acc, 2),
            "training_samples": len(train_dataset),
            "test_samples": len(test_dataset),
            "total_training_time_sec": round(total_time, 1),
            "history": epoch_history
        }, f, indent=2)
    print(f"Metrics saved to: {METRICS_SAVE_PATH}")
    print("=" * 65)

if __name__ == "__main__":
    main()
