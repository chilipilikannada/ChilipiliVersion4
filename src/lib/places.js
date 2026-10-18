// Gini's journey across Karnataka. Every activity wins stars; every STEP stars, Gini flies to a new place
// and the child collects its sticker. Facts are kept simple and true for 5 to 10 year olds.
export const STEP = 15;
export const PLACES = [
  { id: "bengaluru", kn: "ಬೆಂಗಳೂರು", en: "Bengaluru", pic: "🌳", color: "#2f9e5a", fact: "The Garden City! Lalbagh garden has a glass house full of flowers." },
  { id: "mysuru", kn: "ಮೈಸೂರು", en: "Mysuru", pic: "🏰", color: "#d4a017", fact: "At Dasara the Mysuru Palace glows with almost 100,000 lights." },
  { id: "kodagu", kn: "ಕೊಡಗು", en: "Kodagu", pic: "☕", color: "#6b4f2a", fact: "Misty green hills where coffee grows." },
  { id: "jog", kn: "ಜೋಗ ಜಲಪಾತ", en: "Jog Falls", pic: "💦", color: "#2b7bbf", fact: "Water falls about 830 feet: one of India's tallest waterfalls." },
  { id: "hampi", kn: "ಹಂಪಿ", en: "Hampi", pic: "🛕", color: "#c2672b", fact: "An old city of kings, with a chariot carved out of stone." },
  { id: "udupi", kn: "ಉಡುಪಿ", en: "Udupi", pic: "🍛", color: "#e0610e", fact: "Home of a famous Krishna temple, and of yummy dosas." },
  { id: "gokarna", kn: "ಗೋಕರ್ಣ", en: "Gokarna", pic: "🏖️", color: "#1aa3a3", fact: "Golden beaches by the Arabian Sea." },
  { id: "mangaluru", kn: "ಮಂಗಳೂರು", en: "Mangaluru", pic: "🎭", color: "#b5179e", fact: "On this coast, Yakshagana dancers wear giant, sparkly crowns." },
  { id: "shravanabelagola", kn: "ಶ್ರವಣಬೆಳಗೊಳ", en: "Shravanabelagola", pic: "🗿", color: "#7d7d7d", fact: "A giant statue, about 57 feet tall, carved from one single rock." },
  { id: "belur", kn: "ಬೇಲೂರು", en: "Belur", pic: "🪷", color: "#8e5bd0", fact: "Temple walls covered in tiny stone carvings of dancers and animals." },
  { id: "chikkamagaluru", kn: "ಚಿಕ್ಕಮಗಳೂರು", en: "Chikkamagaluru", pic: "⛰️", color: "#3d8b3d", fact: "Mullayanagiri, the highest peak in Karnataka, is here." },
  { id: "badami", kn: "ಬಾದಾಮಿ", en: "Badami", pic: "🪨", color: "#b8452e", fact: "Cave temples cut right into red rock cliffs." },
  { id: "bidar", kn: "ಬೀದರ್", en: "Bidar", pic: "🏯", color: "#3b3b6d", fact: "A big old fort, and shiny silver patterns on black metal called Bidri." },
];
export const unlockedCount = (stars = 0) => Math.min(PLACES.length, 1 + Math.floor((stars || 0) / STEP));
export const nextPlace = (stars = 0) => {
  const n = unlockedCount(stars);
  return n >= PLACES.length ? null : { place: PLACES[n], need: n * STEP - (stars || 0) };
};
