export interface ProductSpecifications {
    Type: string;
    Material: string;
    InternalFinish?: string;
    GloveSurface?: string;
    Colour?: string;
    GloveShape?: string;
    Size?: string;
    [key: string]: string | undefined;
}

export interface SempermedProduct {
    name: string;
    image: string;
    specifications: ProductSpecifications;
}

export const sempermedProducts: SempermedProduct[] = [
    {
        name: "sempermed® syntegra X",
        image: "https://www.sempermed.com/fileadmin/user_upload/MediaLibrary/Sempermed/Products/Surgical_Gloves/Sempermed_syntegra_X/Packshot_Dispenser_sempermed_syntegra_X.png",
        specifications: {
            Type: "Radiation attenuating surgical glove for single use, with synthetic inner coating",
            Material: "Soft synthetic polyisoprene containing lead-free radiation attenuating tungsten alloy. Formulated without DPG and without MBT.",
            InternalFinish: "Powder-free polymer coated",
            GloveSurface: "micro-rough",
            Colour: "Dark grey",
            GloveShape: "Fully anatomical with curved fingers and rolled rim",
            Size: "Overall length as per EN 455-2, 5 ½, 6, 6 ½, 7, 7½, 8, 8 ½ and 9 min. 285 mm"
        }
    },
    {
        name: "sempermed® supreme",
        image: "https://www.sempermed.com/fileadmin/user_upload/MediaLibrary/Sempermed/News/Rebranding_Artwork/supreme.jpg",
        specifications: {
            Type: "Sterile surgical glove for single use, with synthetic inner coating",
            Material: "Natural Rubber (NR)",
            InternalFinish: "Powder-free polymer coated",
            GloveSurface: "Micro-rough",
            Colour: "Natural white",
            GloveShape: "Fully anatomical with curved fingers and rolled rim",
            Size: "Overall length as per EN 455-2, 5 ½, 6 and 6 ½ min. 270 mm; 7, 7 ½ and 8 min. 280 mm; 8 ½ and 9 min. 285 mm"
        }
    },
    {
        name: "sempermed® syntegra UV",
        image: "https://www.sempermed.com/fileadmin/user_upload/MediaLibrary/Sempermed/News/Rebranding_Artwork/syntegra_UV.jpg",
        specifications: {
            Type: "Sterile and accelerator-free surgical glove for single use, with synthetic inner coating",
            Material: "Synthetic polyisoprene, free from natural rubber latex",
            InternalFinish: "Powder-free polymer coated",
            GloveSurface: "Smooth",
            Colour: "White",
            GloveShape: "Fully anatomical with curved fingers and rolled rim",
            Size: "Overall length as per EN 455-2, 5 ½, 6, 6 ½, 7, 7 ½, 8, 8 ½ and 9 min. 285 mm"
        }
    }
];
