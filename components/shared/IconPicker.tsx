'use client';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './IconPicker.module.scss';
const names=['BadgeCheck','BarChart3','Bot','BriefcaseBusiness','Building2','Cloud','Code2','Cpu','Database','FileCheck2','Globe2','Handshake','Headphones','Landmark','Layers3','LockKeyhole','Megaphone','MonitorCog','Network','Rocket','ShieldCheck','ShoppingCart','Smartphone','UsersRound','Wifi'];
const iconSet = Icons as unknown as Record<string, LucideIcon>;
export function IconPicker({value,onChange}:{value?:string;onChange:(name:string)=>void}){const Current=iconSet[value??'']??Icons.Sparkles;return <div className={styles.picker}><div className={styles.current}><Current size={20}/><span>{value||'Chưa chọn biểu tượng'}</span></div><div className={styles.grid} role="listbox" aria-label="Chọn biểu tượng">{names.map(name=>{const Icon=iconSet[name];return <button key={name} type="button" role="option" title={name} aria-label={name} aria-selected={value===name} className={value===name?styles.selected:''} onClick={()=>onChange(name)}><Icon size={19}/></button>})}</div></div>}
