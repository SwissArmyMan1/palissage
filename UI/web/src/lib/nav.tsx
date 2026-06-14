import {
  LayoutDashboard,
  Wine,
  Landmark,
  Truck,
  Store,
  Package,
  ArrowLeftRight,
  User,
  Users,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import type { NavItem } from '@/components/layout/DashboardLayout';
import { zoneLink } from './zone';

export const wineryNav: NavItem[] = [
  { to: zoneLink('winery', ''), label: 'Dashboard', icon: <LayoutDashboard size={20} />, end: true },
  { to: zoneLink('winery', '/lots'), label: 'Lots', icon: <Wine size={20} /> },
  { to: zoneLink('winery', '/finance'), label: 'Finance', icon: <Landmark size={20} /> },
  { to: zoneLink('winery', '/deliveries'), label: 'Deliveries', icon: <Truck size={20} /> },
];

export const shopNav: NavItem[] = [
  { to: zoneLink('shop', ''), label: 'Market', icon: <Store size={20} />, end: true },
  { to: zoneLink('shop', '/portfolio'), label: 'Portfolio', icon: <Package size={20} /> },
  { to: zoneLink('shop', '/secondary'), label: 'Secondary', icon: <ArrowLeftRight size={20} /> },
  { to: zoneLink('shop', '/profile'), label: 'Profile', icon: <User size={20} /> },
];

export const adminNav: NavItem[] = [
  { to: zoneLink('admin', ''), label: 'Overview', icon: <LayoutDashboard size={20} />, end: true },
  { to: zoneLink('admin', '/participants'), label: 'Members', icon: <Users size={20} /> },
  { to: zoneLink('admin', '/verification'), label: 'Verify', icon: <ShieldCheck size={20} /> },
  { to: zoneLink('admin', '/settings'), label: 'Settings', icon: <Settings size={20} /> },
];
