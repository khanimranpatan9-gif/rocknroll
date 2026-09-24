// Menu Database for Rock N Rolls (Bismillah IR FOODS)
const MENU_DATA = {
  restaurant: {
    name: "Rock N Rolls",
    entity: "Bismillah IR FOODS",
    proprietor: "Irfan",
    tagline: "Good Food, Good Mood",
    subtitle: "Kathi Rolls • Fried Chicken • Burgers • Pizza • Combos • Fried Rice",
    phoneNumbers: ["9848879728", "9959002870", "9133789361"],
    primaryPhone: "9848879728",
    rating: 4.8,
    reviews: "1.8k+",
    deliveryTime: "15-20 mins prep",
    kitchenType: "Live Kitchen",
    badge: "Top Rated Live Kitchen",
    location: "Rock N Rolls Live Kitchen",
    timings: "1:00 PM – 10:30 PM",
    guarantee: "Served steaming hot or your next roll is on us."
  },
  categories: [
    { id: "all", name: "All", count: 49 },
    { id: "rolls", name: "Rolls", count: 7 },
    { id: "fried-chicken", name: "Fried Chicken", count: 8 },
    { id: "combos", name: "Combos", count: 3 },
    { id: "burgers", name: "Burgers", count: 5 },
    { id: "pizza-veg", name: "Veg Pizza", count: 6 },
    { id: "pizza-nonveg", name: "Chicken Pizza", count: 5 },
    { id: "fries", name: "Fries", count: 3 },
    { id: "fried-rice", name: "Fried Rice", count: 4 },
    { id: "noodles", name: "Noodles", count: 4 },
    { id: "momos", name: "Momos", count: 2 },
    { id: "starters", name: "Starters", count: 2 }
  ],
  customizerAddons: [
    { id: "addon-egg", name: "Double Fried Egg", price: 15, desc: "Extra pan-fried spiced omelette layer" },
    { id: "addon-cheese", name: "Melted Amul Mozzarella", price: 25, desc: "Gooey stringy cheese melt inside" },
    { id: "addon-dip", name: "Fiery Schezwan Mayo Dip", price: 10, desc: "Tangy garlic chili midnight spread" }
  ],
  items: [
    // ==========================================
    // 1. ROLLS (7 ITEMS) - Flat Pricing
    // ==========================================
    {
      id: "egg-roll",
      name: "Egg Roll",
      category: "rolls",
      isVeg: false,
      isEgg: true,
      bestseller: false,
      popular: true,
      rating: 4.5,
      prepTime: "10 mins",
      description: "Flaky paratha with fluffy spiced egg omelette & onions.",
      image: "assets/egg_roll.jpg",
      hasPortions: false,
      price: 50,
      tags: ["Crispy", "Egg Special"]
    },
    {
      id: "veg-gobi-roll",
      name: "Veg Gobi Roll",
      category: "rolls",
      isVeg: true,
      bestseller: false,
      popular: false,
      rating: 4.3,
      prepTime: "12 mins",
      description: "Crispy spiced cauliflower & mint chutney in paratha.",
      image: "assets/veg_gobi_roll.jpg",
      hasPortions: false,
      price: 50,
      tags: ["100% Veg", "Crispy Gobi"]
    },
    {
      id: "egg-gobi-roll",
      name: "Egg Gobi Roll",
      category: "rolls",
      isVeg: false,
      isEgg: true,
      bestseller: false,
      popular: false,
      rating: 4.4,
      prepTime: "12 mins",
      description: "Spiced cauliflower & fluffy egg in warm paratha.",
      image: "assets/egg_gobi_roll.jpg",
      hasPortions: false,
      price: 60,
      tags: ["Egg + Gobi", "Street Style"]
    },
    {
      id: "veg-paneer-roll",
      name: "Veg Paneer Roll",
      category: "rolls",
      isVeg: true,
      bestseller: false,
      popular: true,
      rating: 4.6,
      prepTime: "15 mins",
      description: "Tandoori paneer cubes wrapped in flaky paratha.",
      image: "assets/veg_paneer_roll.jpg",
      hasPortions: false,
      price: 80,
      tags: ["100% Veg", "Tandoori Paneer"]
    },
    {
      id: "egg-paneer-roll",
      name: "Egg Paneer Roll",
      category: "rolls",
      isVeg: false,
      isEgg: true,
      bestseller: false,
      popular: false,
      rating: 4.6,
      prepTime: "15 mins",
      description: "Tandoori paneer & egg omelette in warm paratha.",
      image: "assets/egg_paneer_roll.jpg",
      hasPortions: false,
      price: 90,
      tags: ["Egg + Paneer", "Rich Protein"]
    },
    {
      id: "egg-chicken-roll",
      name: "Egg Chicken Roll",
      category: "rolls",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "15 mins",
      description: "Juicy spiced chicken & egg in fresh paratha.",
      image: "assets/egg_chicken_roll.jpg",
      hasPortions: false,
      price: 80,
      tags: ["Bestseller", "Fire Sizzled"]
    },
    {
      id: "egg-double-chicken-roll",
      name: "Egg Double Chicken Roll",
      category: "rolls",
      isVeg: false,
      bestseller: true,
      chefSpecial: true,
      popular: true,
      rating: 4.9,
      prepTime: "15 mins",
      description: "Double portion of spiced chicken & egg in paratha.",
      image: "assets/egg_double_chicken_roll.jpg",
      hasPortions: false,
      price: 100,
      tags: ["Chef Special", "Double Loaded"]
    },

    // ==========================================
    // 2. CRISPY & HOT FRIED CHICKEN (8 ITEMS)
    // ==========================================
    {
      id: "mini-box-chicken",
      name: "Mini Box (6 Pcs)",
      category: "fried-chicken",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "15 mins",
      description: "6 pcs crunchy golden fried chicken with savory spices.",
      image: "assets/mini_box_chicken.jpg",
      hasPortions: false,
      price: 260,
      tags: ["6 Pcs", "Crispy Fried", "Popular"]
    },
    {
      id: "medium-bucket-chicken",
      name: "Medium Bucket Chicken",
      category: "fried-chicken",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.9,
      prepTime: "18 mins",
      description: "Crunchy fried chicken bucket, perfect for sharing.",
      image: "assets/bucket_chicken.jpg",
      hasPortions: false,
      price: 490,
      tags: ["Sharing Bucket", "Crispy Fried"]
    },
    {
      id: "large-bucket-chicken",
      name: "Large Bucket Chicken",
      category: "fried-chicken",
      isVeg: false,
      chefSpecial: true,
      popular: true,
      rating: 4.9,
      prepTime: "20 mins",
      description: "Giant feast bucket of extra crunchy fried chicken.",
      image: "assets/large_bucket_chicken.jpg",
      hasPortions: false,
      price: 700,
      tags: ["Family Feast", "Chef Special"]
    },
    {
      id: "hot-crispy-leg-piece",
      name: "Hot Crispy Leg Piece (2 Pcs)",
      category: "fried-chicken",
      isVeg: false,
      bestseller: false,
      popular: true,
      rating: 4.7,
      prepTime: "12 mins",
      description: "2 juicy chicken drumsticks in fiery crispy batter.",
      image: "assets/hot_crispy_leg_piece.jpg",
      hasPortions: false,
      price: 120,
      tags: ["2 Pcs Drumsticks", "Hot & Crispy"]
    },
    {
      id: "apple-chicken",
      name: "Apple Chicken",
      category: "fried-chicken",
      isVeg: false,
      bestseller: false,
      popular: true,
      rating: 4.6,
      prepTime: "15 mins",
      description: "Crispy lollipop chicken with zesty seasonings.",
      image: "assets/apple_chicken.jpg",
      hasPortions: true,
      price: 80,
      portions: [
        { id: "3pcs", name: "3 Pcs", label: "3 Pcs Solo portion", price: 80, isDefault: true },
        { id: "6pcs", name: "6 Pcs", label: "6 Pcs Sharing portion", price: 170 }
      ],
      tags: ["Specialty", "Juicy Cuts"]
    },
    {
      id: "hot-wings",
      name: "Hot Wings (6 Pcs)",
      category: "fried-chicken",
      isVeg: false,
      isSpicy: true,
      bestseller: false,
      popular: true,
      rating: 4.7,
      prepTime: "15 mins",
      description: "6 crispy fried wings coated in spicy pepper glaze.",
      image: "assets/hot_wings.jpg",
      hasPortions: false,
      price: 130,
      tags: ["Spicy 🔥", "6 Pcs Wings"]
    },
    {
      id: "popcorn-chicken",
      name: "Pop Corn",
      category: "fried-chicken",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.7,
      prepTime: "10 mins",
      description: "Bite-sized crunchy chicken pops with mayo dip.",
      image: "assets/popcorn_chicken.jpg",
      hasPortions: true,
      price: 120,
      portions: [
        { id: "med", name: "Medium", label: "Medium box portion", price: 120, isDefault: true },
        { id: "large", name: "Large", label: "Large sharing portion", price: 180 }
      ],
      tags: ["Boneless", "Crunchy Pops"]
    },
    {
      id: "chicken-strips",
      name: "Chicken Strips",
      category: "fried-chicken",
      isVeg: false,
      bestseller: false,
      popular: true,
      rating: 4.6,
      prepTime: "12 mins",
      description: "Crispy boneless chicken breast tenders.",
      image: "assets/chicken_strips.jpg",
      hasPortions: true,
      price: 70,
      portions: [
        { id: "3pcs", name: "3 Pcs", label: "3 Pcs portion", price: 70, isDefault: true },
        { id: "6pcs", name: "6 Pcs", label: "6 Pcs portion", price: 140 }
      ],
      tags: ["Boneless", "Crispy Tenders"]
    },

    // ==========================================
    // 3. COMBOS (3 ITEMS) - Fries + 200ml Pepsi
    // ==========================================
    {
      id: "combo-2pcs-chicken",
      name: "2 Pcs Hot & Crispy Chicken Combo",
      category: "combos",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.9,
      prepTime: "15 mins",
      description: "2 pcs crispy chicken with fries & chilled Pepsi.",
      image: "assets/chicken_combo.jpg",
      hasPortions: false,
      price: 170,
      tags: ["Value Meal", "Fries + Pepsi 🥤"]
    },
    {
      id: "combo-crispy-wrap",
      name: "Crispy Chicken Wrap Combo",
      category: "combos",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "15 mins",
      description: "Crispy chicken wrap with fries & chilled Pepsi.",
      image: "assets/wrap_combo.jpg",
      hasPortions: false,
      price: 170,
      tags: ["Wrap Combo", "Fries + Pepsi 🥤"]
    },
    {
      id: "combo-3-apple-chicken",
      name: "3 Apple Chicken Combo",
      category: "combos",
      isVeg: false,
      bestseller: false,
      popular: true,
      rating: 4.7,
      prepTime: "15 mins",
      description: "3 pcs apple chicken with fries & chilled Pepsi.",
      image: "assets/apple_chicken_combo.jpg",
      hasPortions: false,
      price: 170,
      tags: ["Apple Chicken", "Fries + Pepsi 🥤"]
    },

    // ==========================================
    // 4. BURGERS (5 ITEMS)
    // ==========================================
    {
      id: "hot-crispy-chicken-burger",
      name: "Hot & Crispy Chicken Burger",
      category: "burgers",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "12 mins",
      description: "Crispy chicken fillet with lettuce & burger mayo.",
      image: "assets/crispy_chicken_burger.jpg",
      hasPortions: false,
      price: 89,
      tags: ["Bestseller", "Crispy Fillet"]
    },
    {
      id: "mega-king-burger",
      name: "Mega King Burger",
      category: "burgers",
      isVeg: false,
      chefSpecial: true,
      popular: true,
      rating: 4.9,
      prepTime: "15 mins",
      description: "Double chicken patty with melted cheese & sauce.",
      image: "assets/mega_king_burger.jpg",
      hasPortions: false,
      price: 120,
      tags: ["Chef Special", "Double Loaded"]
    },
    {
      id: "malaysian-egg-wrapper-burger",
      name: "Malaysian Egg Wrapper Burger",
      category: "burgers",
      isVeg: false,
      isEgg: true,
      bestseller: false,
      popular: true,
      rating: 4.7,
      prepTime: "15 mins",
      description: "Spiced patty encased in savory folded egg wrap.",
      image: "assets/malaysian_egg_burger.jpg",
      hasPortions: false,
      price: 140,
      tags: ["Street Special", "Egg Wrapped"]
    },
    {
      id: "veg-burger",
      name: "Veg Burger",
      category: "burgers",
      isVeg: true,
      bestseller: false,
      popular: false,
      rating: 4.3,
      prepTime: "10 mins",
      description: "Crispy veggie patty with lettuce & herb mayo.",
      image: "assets/veg_burger.jpg",
      hasPortions: false,
      price: 70,
      tags: ["100% Veg", "Crispy Patty"]
    },
    {
      id: "egg-burger",
      name: "Egg Burger",
      category: "burgers",
      isVeg: false,
      isEgg: true,
      bestseller: false,
      popular: false,
      rating: 4.4,
      prepTime: "10 mins",
      description: "Pan-fried spiced egg patty with fresh greens.",
      image: "assets/egg_burger.jpg",
      hasPortions: false,
      price: 70,
      tags: ["Egg Special", "Juicy"]
    },

    // ==========================================
    // 5. PIZZA COURT - VEG (6 ITEMS)
    // ==========================================
    {
      id: "veg-pizza",
      name: "Veg Pizza",
      category: "pizza-veg",
      isVeg: true,
      bestseller: false,
      popular: true,
      rating: 4.5,
      prepTime: "18 mins",
      description: "Hand-stretched crust with veggies & melted mozzarella.",
      image: "assets/veg_pizza.jpg",
      hasPortions: false,
      price: 179,
      tags: ["100% Veg", "Fresh Crust"]
    },
    {
      id: "golden-corn-pizza",
      name: "Golden Corn Pizza",
      category: "pizza-veg",
      isVeg: true,
      bestseller: false,
      popular: true,
      rating: 4.6,
      prepTime: "18 mins",
      description: "Sweet golden corn with molten mozzarella cheese.",
      image: "assets/corn_pizza.jpg",
      hasPortions: false,
      price: 210,
      tags: ["Sweet Corn", "Cheesy"]
    },
    {
      id: "veggie-mushroom-pizza",
      name: "Veggie Mushroom Pizza",
      category: "pizza-veg",
      isVeg: true,
      bestseller: false,
      popular: false,
      rating: 4.5,
      prepTime: "18 mins",
      description: "Fresh button mushrooms with herbs & mozzarella.",
      image: "assets/mushroom_pizza.jpg",
      hasPortions: false,
      price: 210,
      tags: ["100% Veg", "Button Mushroom"]
    },
    {
      id: "onion-capsicum-pizza",
      name: "Onion Capsicum Pizza",
      category: "pizza-veg",
      isVeg: true,
      bestseller: false,
      popular: false,
      rating: 4.4,
      prepTime: "18 mins",
      description: "Crisp capsicum, red onions & melted mozzarella.",
      image: "assets/onion_capsicum_pizza.jpg",
      hasPortions: false,
      price: 210,
      tags: ["100% Veg", "Crunchy"]
    },
    {
      id: "cheese-pizza",
      name: "Cheese Pizza",
      category: "pizza-veg",
      isVeg: true,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "15 mins",
      description: "Double loaded stringy mozzarella & cheddar cheese.",
      image: "assets/cheese_pizza.jpg",
      hasPortions: false,
      price: 250,
      tags: ["Extra Cheesy", "Bestseller"]
    },
    {
      id: "periperi-spicy-pizza",
      name: "Peri Peri Spicy Pizza",
      category: "pizza-veg",
      isVeg: true,
      isSpicy: true,
      bestseller: false,
      popular: true,
      rating: 4.6,
      prepTime: "18 mins",
      description: "Spicy peri-peri veggies, jalapeños & mozzarella.",
      image: "assets/periperi_veg_pizza.jpg",
      hasPortions: false,
      price: 210,
      tags: ["Spicy 🔥", "Peri Peri"]
    },

    // ==========================================
    // 6. PIZZA COURT - NON VEG (5 ITEMS)
    // ==========================================
    {
      id: "chicken-pizza",
      name: "Chicken Pizza",
      category: "pizza-nonveg",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "20 mins",
      description: "Herb chicken, bell peppers & bubbling mozzarella.",
      image: "assets/chicken_pizza.jpg",
      hasPortions: false,
      price: 230,
      tags: ["Bestseller", "Juicy Chicken"]
    },
    {
      id: "peri-peri-chicken-pizza",
      name: "Peri Peri Chicken Pizza",
      category: "pizza-nonveg",
      isVeg: false,
      isSpicy: true,
      bestseller: false,
      popular: true,
      rating: 4.8,
      prepTime: "20 mins",
      description: "Fiery peri-peri chicken, jalapeños & mozzarella.",
      image: "assets/periperi_chicken_pizza.jpg",
      hasPortions: false,
      price: 240,
      tags: ["Spicy 🔥", "Peri Peri"]
    },
    {
      id: "chicken-margarita-pizza",
      name: "Chicken Margarita Pizza",
      category: "pizza-nonveg",
      isVeg: false,
      bestseller: false,
      popular: true,
      rating: 4.7,
      prepTime: "18 mins",
      description: "Roasted chicken with tomato basil sauce & mozzarella.",
      image: "assets/chicken_margherita_pizza.jpg",
      hasPortions: false,
      price: 240,
      tags: ["Classic Basil", "Italian Style"]
    },
    {
      id: "chicken-salami-pizza",
      name: "Chicken Salami Pizza",
      category: "pizza-nonveg",
      isVeg: false,
      chefSpecial: true,
      popular: true,
      rating: 4.9,
      prepTime: "20 mins",
      description: "Smoked chicken salami rounds with rich mozzarella.",
      image: "assets/chicken_salami_pizza.jpg",
      hasPortions: false,
      price: 280,
      tags: ["Chef Special", "Smoked Salami"]
    },
    {
      id: "chicken-sausage-pizza",
      name: "Chicken Sausage Pizza",
      category: "pizza-nonveg",
      isVeg: false,
      bestseller: false,
      popular: true,
      rating: 4.7,
      prepTime: "20 mins",
      description: "Juicy chicken sausages, peppers & melted cheese.",
      image: "assets/chicken_sausage_pizza.jpg",
      hasPortions: false,
      price: 240,
      tags: ["Chicken Sausage", "Loaded"]
    },

    // ==========================================
    // 7. FRIES (3 ITEMS) - Small / Large
    // ==========================================
    {
      id: "french-fries",
      name: "French Fries",
      category: "fries",
      isVeg: true,
      bestseller: false,
      popular: true,
      rating: 4.5,
      prepTime: "10 mins",
      description: "Crispy salted potato fries served with ketchup.",
      image: "assets/french_fries.jpg",
      hasPortions: true,
      price: 70,
      portions: [
        { id: "small", name: "Small", label: "Solo snack portion", price: 70, isDefault: true },
        { id: "large", name: "Large", label: "Large sharing portion", price: 120 }
      ],
      tags: ["Crispy", "Classic"]
    },
    {
      id: "peri-peri-fries",
      name: "Peri Peri Fries",
      category: "fries",
      isVeg: true,
      isSpicy: true,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "10 mins",
      description: "Crispy fries tossed in spicy peri-peri masala.",
      image: "assets/periperi_fries.jpg",
      hasPortions: true,
      price: 90,
      portions: [
        { id: "small", name: "Small", label: "Solo snack portion", price: 90, isDefault: true },
        { id: "large", name: "Large", label: "Large sharing portion", price: 130 }
      ],
      tags: ["Spicy 🔥", "Peri Peri"]
    },
    {
      id: "cheese-fries",
      name: "Cheese Fries",
      category: "fries",
      isVeg: true,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "10 mins",
      description: "Crispy fries topped with warm melted cheese.",
      image: "assets/cheese_fries.jpg",
      hasPortions: false,
      price: 100,
      tags: ["Loaded Cheese", "Cheesy Melt"]
    },

    // ==========================================
    // 8. FRIED RICE (4 ITEMS) - FULL & HALF
    // ==========================================
    {
      id: "egg-fried-rice",
      name: "Egg Fried Rice",
      category: "fried-rice",
      isVeg: false,
      isEgg: true,
      bestseller: false,
      popular: false,
      rating: 4.4,
      prepTime: "12 mins",
      description: "Wok-tossed rice with scrambled egg & spring onions.",
      image: "assets/egg_fried_rice.jpg",
      hasPortions: true,
      price: 50,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 50, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 80 }
      ],
      tags: ["Wok Tossed"]
    },
    {
      id: "gobi-fried-rice",
      name: "Gobi Fried Rice",
      category: "fried-rice",
      isVeg: true,
      bestseller: false,
      popular: false,
      rating: 4.3,
      prepTime: "12 mins",
      description: "Garlic fried rice with crispy spiced cauliflower.",
      image: "assets/gobi_fried_rice.jpg",
      hasPortions: true,
      price: 60,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 60, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 90 }
      ],
      tags: ["100% Veg"]
    },
    {
      id: "paneer-fried-rice",
      name: "Paneer Fried Rice",
      category: "fried-rice",
      isVeg: true,
      bestseller: false,
      popular: true,
      rating: 4.5,
      prepTime: "15 mins",
      description: "Golden paneer cubes tossed with wok fried rice.",
      image: "assets/paneer_fried_rice.jpg",
      hasPortions: true,
      price: 70,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 70, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 110 }
      ],
      tags: ["100% Veg", "Fresh Paneer"]
    },
    {
      id: "chicken-fried-rice",
      name: "Chicken Fried Rice",
      category: "fried-rice",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.8,
      prepTime: "15 mins",
      description: "High-flame wok rice with tender chicken & egg.",
      image: "assets/chicken_fried_rice.jpg",
      hasPortions: true,
      price: 70,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 70, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 110 }
      ],
      tags: ["Bestseller", "High Flame Wok"]
    },

    // ==========================================
    // 9. NOODLES (4 ITEMS) - FULL & HALF
    // ==========================================
    {
      id: "egg-noodles",
      name: "Egg Noodles",
      category: "noodles",
      isVeg: false,
      isEgg: true,
      bestseller: false,
      popular: false,
      rating: 4.4,
      prepTime: "15 mins",
      description: "Street noodles tossed with spiced egg ribbons.",
      image: "assets/egg_noodles.jpg",
      hasPortions: true,
      price: 50,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 50, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 80 }
      ],
      tags: ["Street Style"]
    },
    {
      id: "gobi-noodles",
      name: "Gobi Noodles",
      category: "noodles",
      isVeg: true,
      bestseller: false,
      popular: false,
      rating: 4.2,
      prepTime: "12 mins",
      description: "Wok noodles with crispy spiced cauliflower florets.",
      image: "assets/gobi_noodles.jpg",
      hasPortions: true,
      price: 50,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 50, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 80 }
      ],
      tags: ["100% Veg"]
    },
    {
      id: "paneer-noodles",
      name: "Paneer Noodles",
      category: "noodles",
      isVeg: true,
      bestseller: false,
      popular: true,
      rating: 4.6,
      prepTime: "15 mins",
      description: "Soft paneer stir-fried with chili garlic noodles.",
      image: "assets/paneer_noodles.jpg",
      hasPortions: true,
      price: 60,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 60, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 100 }
      ],
      tags: ["100% Veg", "Soft Paneer"]
    },
    {
      id: "chicken-schezwan-noodles",
      name: "Chicken Schezwan Noodles",
      category: "noodles",
      isVeg: false,
      bestseller: true,
      chefSpecial: true,
      isSpicy: true,
      popular: true,
      rating: 4.8,
      prepTime: "15 mins",
      description: "Fiery schezwan noodles with juicy chicken cubes.",
      image: "assets/chicken_schezwan_noodles.jpg",
      hasPortions: true,
      price: 70,
      portions: [
        { id: "half", name: "Half", label: "Solo craving portion", price: 70, isDefault: true },
        { id: "full", name: "Full", label: "Full hearty portion", price: 110 }
      ],
      tags: ["Spicy Schezwan 🔥", "Bestseller"]
    },

    // ==========================================
    // 10. MOMOS (2 ITEMS) - Flat Pricing
    // ==========================================
    {
      id: "veg-fried-momos",
      name: "Veg Fried Momos",
      category: "momos",
      isVeg: true,
      bestseller: false,
      popular: true,
      rating: 4.5,
      prepTime: "15 mins",
      description: "Crispy fried veg dumplings with spicy chutney.",
      image: "assets/veg_fried_momos.jpg",
      hasPortions: false,
      price: 80,
      tags: ["100% Veg", "Crispy Fried"]
    },
    {
      id: "chicken-fried-momos",
      name: "Chicken Fried Momos",
      category: "momos",
      isVeg: false,
      bestseller: true,
      popular: true,
      rating: 4.7,
      prepTime: "15 mins",
      description: "Crispy dumplings stuffed with juicy chicken mince.",
      image: "assets/chicken_fried_momos.jpg",
      hasPortions: false,
      price: 100,
      tags: ["Juicy Chicken", "Crispy Fried"]
    },

    // ==========================================
    // 11. STARTERS (2 ITEMS) - Live Kitchen Specials
    // ==========================================
    {
      id: "chilli-chicken",
      name: "Chilli Chicken",
      category: "starters",
      isVeg: false,
      bestseller: true,
      chefSpecial: true,
      isSpicy: true,
      popular: true,
      rating: 4.7,
      prepTime: "15 mins",
      description: "Crispy chicken tossed in dark soy & green chilies.",
      image: "assets/chilli_chicken.jpg",
      hasPortions: false,
      price: 120,
      tags: ["Chef Special 👨‍🍳", "Spicy 🔥"]
    },
    {
      id: "chicken-pakoda",
      name: "Chicken Pakoda",
      category: "starters",
      isVeg: false,
      bestseller: false,
      popular: true,
      rating: 4.6,
      prepTime: "15 mins",
      description: "Street-style crunchy spiced chicken fritters.",
      image: "assets/chicken_pakoda.jpg",
      hasPortions: false,
      price: 100,
      tags: ["Street Style Fritters", "Hot & Crispy"]
    }
  ],
  initialCart: []
};
