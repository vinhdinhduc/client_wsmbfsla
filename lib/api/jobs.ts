import { apiFetch } from './client';
export interface Job { id:number;title:string;slug:string;category:string;level?:string|null;employment_type:string;store_id?:number|null;location:string;quantity:number;salary_min?:number|null;salary_max?:number|null;salary_type:'range'|'negotiable'|'hidden';description:string;requirements?:string|null;benefits?:string|null;deadline:string;is_hot:boolean;is_urgent:boolean;status:'draft'|'recruiting'|'paused';created_at:string }
export interface JobApplication { id:number;code:string;job_id:number|null;full_name:string;phone:string;email:string;status:'new'|'screening'|'interview'|'accepted'|'rejected';created_at:string;job?:Pick<Job,'id'|'title'> }
export const jobsApi={
 listPublic:(params:{category?:string;location?:string;employment_type?:string;include_expired?:boolean}={})=>apiFetch<Job[]>('/public/jobs',{params}), detail:(slug:string)=>apiFetch<Job>(`/public/jobs/${slug}`),
 apply:(form:FormData)=>apiFetch<{id:number;code:string}>('/public/job-applications',{method:'POST',body:form,isFormData:true}),
 listAdmin:()=>apiFetch<Job[]>('/admin/jobs'), get:(id:number)=>apiFetch<Job>(`/admin/jobs/${id}`), create:(body:Partial<Job>)=>apiFetch<Job>('/admin/jobs',{method:'POST',body}), update:(id:number,body:Partial<Job>)=>apiFetch<Job>(`/admin/jobs/${id}`,{method:'PUT',body}), remove:(id:number)=>apiFetch<null>(`/admin/jobs/${id}`,{method:'DELETE'}),
 applications:()=>apiFetch<JobApplication[]>('/admin/jobs/applications'), updateApplication:(id:number,body:Partial<JobApplication>)=>apiFetch<JobApplication>(`/admin/jobs/applications/${id}`,{method:'PATCH',body}), cv:(id:number)=>apiFetch<Blob>(`/admin/jobs/applications/${id}/cv`), exportApplications:()=>apiFetch<Blob>('/admin/jobs/applications/export'),
};
