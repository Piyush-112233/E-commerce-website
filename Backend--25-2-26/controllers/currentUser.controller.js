export const getCurrentUser = async (req,res) => {
    return res.status(200).json({
        success: true,
        data: req.user,
        message: 'Current User fetched Successfully'
    })
}