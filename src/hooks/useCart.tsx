import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

interface ProductStock {
  id: number;
  amount: number;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(item => item.id === productId);
      const response = await api.get(`/stock/${productId}`);
      const productStock = response.data;

      if (product) {

        if (product.amount === productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = cart.map(item => {
          if (item.id === productId) {
            return {
              ...item,
              amount: item.amount + 1,
            }
          }
          return item;
        });
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      } else {
        const { data } = await api.get(`/products/${productId}`);
        const newCart = [...cart, {
          ...data,
          amount: 1
        }]
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(item => item.id === productId);
      if (product) {
        const newCart = cart.filter(item => {
          return item.id !== productId;
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const response = await api.get(`/stock/${productId}`);
      const productStock = response.data;
      if (productStock.amount > amount) {

        const newCart = cart.map(product => {
          if(product.id === productId) {
            return {
              ...product,
              amount,
            }
          }
          return product;
        })

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);

      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
