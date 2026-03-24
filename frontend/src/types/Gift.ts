export interface Gift {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export interface OrderGift {
  id: number;
  name: string;
  amount: number;
  quantity: number;
}
