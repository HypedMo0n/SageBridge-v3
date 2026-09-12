'use client';
import {useEffect,useState} from 'react';
import {api,type Customer,type Invoice,type Product,type Quote} from './api';
export function useSageData(){const [customers,setCustomers]=useState<Customer[]>([]),[invoices,setInvoices]=useState<Invoice[]>([]),[quotes,setQuotes]=useState<Quote[]>([]),[products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');useEffect(()=>{Promise.all([api.getCustomers(),api.getInvoices(),api.getQuotes(),api.getProducts()]).then(([c,i,q,p])=>{setCustomers(c);setInvoices(i);setQuotes(q);setProducts(p)}).catch(e=>setError(e instanceof Error?e.message:'Could not load Sage data')).finally(()=>setLoading(false))},[]);return{customers,invoices,quotes,products,loading,error}}
