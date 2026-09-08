// GoEat — shared domain types

export interface Dish {
  id: string;
  name: string;
  cat: string;
  price: number;
  promo: number | null;
  img: string;
  rating: number;
  sold: number;
  tag: string | null;
  kcal: number;
  eta: string;
  desc: string;
  ingredients: string[];
}

export interface Day {
  id: string;
  short: string;
  full: string;
  date: string;
}

export interface Shift {
  id: string;
  name: string;
  work: string;
  meal: string;
  serve: string;
  group: "main" | "ot";
}

export interface Employee {
  name: string;
  code: string;
  dept: string;
  shift: string;
  phone: string;
  avatar: string;
  mealsThisMonth: number;
  qr: string;
}

export type MealStatusKey = "registered" | "ordered" | "preparing" | "received";

// { [dayId]: { [shiftId]: dishId } }
export type MealPlan = Record<string, Record<string, string>>;

// { [dayId]: { [shiftId]: dishId[] } }
export type WeekMenu = Record<string, Record<string, string[]>>;
