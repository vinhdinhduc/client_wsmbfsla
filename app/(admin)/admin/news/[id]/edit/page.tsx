import{NewsEditor}from'../../NewsEditor';export default async function EditNews({params}:{params:Promise<{id:string}>}){const{id}=await params;return <NewsEditor id={Number(id)}/>}
