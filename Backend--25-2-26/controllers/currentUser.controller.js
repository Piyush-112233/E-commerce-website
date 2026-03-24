export const getCurrentUser = async (req,res) => {
    return res.status(200).json(200,req.user,'Current User fetched Successfully')
}