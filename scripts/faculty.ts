export interface PathData
{
    id: string;
    name: string;
    url: string;
}

export interface FacultyData 
{
    id: number;
    name: string;
    url: string;
    programs: PathData[];
}