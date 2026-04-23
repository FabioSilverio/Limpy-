import type { LucideIcon } from 'lucide-react'
import {
  Baby,
  Bath,
  BookOpen,
  Coffee,
  Dog,
  Droplets,
  Fan,
  Flower2,
  Home,
  LampDesk,
  Leaf,
  Mail,
  Martini,
  Music,
  Package,
  PaintRoller,
  Pizza,
  Refrigerator,
  Shirt,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  TreeDeciduous,
  UtensilsCrossed,
  WashingMachine,
  Wind,
} from 'lucide-react'

export const CHORE_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'home', label: 'Casa geral', Icon: Home },
  { key: 'sparkles', label: 'Limpeza', Icon: Sparkles },
  { key: 'utensils', label: 'Cozinha / louça', Icon: UtensilsCrossed },
  { key: 'refrigerator', label: 'Geladeira / compras', Icon: Refrigerator },
  { key: 'trash', label: 'Lixo', Icon: Trash2 },
  { key: 'shirt', label: 'Roupa / passar', Icon: Shirt },
  { key: 'washing', label: 'Lavadora', Icon: WashingMachine },
  { key: 'bath', label: 'Banheiro', Icon: Bath },
  { key: 'droplets', label: 'Água / vazão', Icon: Droplets },
  { key: 'package', label: 'Organizar', Icon: Package },
  { key: 'shopping', label: 'Mercado', Icon: ShoppingBag },
  { key: 'leaf', label: 'Plantas', Icon: Leaf },
  { key: 'flower', label: 'Jardim / flores', Icon: Flower2 },
  { key: 'tree', label: 'Área externa', Icon: TreeDeciduous },
  { key: 'dog', label: 'Pets', Icon: Dog },
  { key: 'baby', label: 'Crianças', Icon: Baby },
  { key: 'lamp', label: 'Luzes / lâmpadas', Icon: LampDesk },
  { key: 'paint', label: 'Pintura / manutenção', Icon: PaintRoller },
  { key: 'fan', label: 'Ar / ventilador', Icon: Fan },
  { key: 'wind', label: 'Janelas / ar', Icon: Wind },
  { key: 'coffee', label: 'Café / pausa', Icon: Coffee },
  { key: 'pizza', label: 'Refeição / delivery', Icon: Pizza },
  { key: 'martini', label: 'Especiais / evento', Icon: Martini },
  { key: 'book', label: 'Papéis / leitura', Icon: BookOpen },
  { key: 'music', label: 'Sons / mídia', Icon: Music },
  { key: 'sun', label: 'Manhã / rotina', Icon: Sun },
  { key: 'mail', label: 'Correio / encomendas', Icon: Mail },
]

const byKey: Record<string, LucideIcon> = Object.fromEntries(
  CHORE_ICONS.map((e) => [e.key, e.Icon]),
)

export function getChoreIcon(key: string): LucideIcon {
  return byKey[key] ?? Home
}
