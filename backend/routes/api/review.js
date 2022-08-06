const express = require('express')

const {setTokenCookie, restoreUser, requireAuth } = require('../../utils/auth');

const { Booking, Image, Review, Spot, User, sequelize } = require("../../db/models");
const { Op } = require("sequelize");

const router = express.Router()


//Get Current user
router.get('/current', requireAuth, async (req, res) => {
const reviews = await Review.findAll({
  where: {
      userId: req.user.id
  },
  include: [
      { model: User, attributes: ['id', 'firstName', 'lastName'] },
      { model: Spot, attributes: ['id', 'ownerId', 'address', 'city', 'state', 'country', 'lat', 'lng', 'name', 'price'] },
      { model: Image, attributes: ['id', ['reviewId', 'imageableId'], 'url'] }
  ]
});

res.status(200);
return res.json({ Reviews: reviews })
});




//Add an Image to a Review based on the Reviews id *****

router.post('/:reviewId/images', restoreUser, requireAuth, async (req, res) => {
  const reviewId = req.params.reviewId
  const findReview = await Review.findByPk(reviewId)

  if (!findReview){
    res.status(404)
    res.json({
      "message": "Review couldn't be found",
      "statusCode": 404
    })
  }
  const imgCnt = await Image.count({
    where: { previewImage : true}
  })
  if (imgCnt >= 10){
    res.status(403)
    res.json({
      "message": "Maximum number of images for this resource was reached",
      "statusCode": 403
    })
}

  const { url } = req.body
  let image = await Image.create({
    url: url,
    reviewId: reviewId,
    userId: req.user.id
  })
  const obj = {id: image.id,
  imageableId: image.reviewId, url: image.url}
  res.status(200)
  res.json(obj)
})

//Edit a review
router.put('/:reviewId', requireAuth, restoreUser, async (req, res) => {
  let reviewId = req.params.reviewId

  const {review, stars} = req.body

  const getreview = await Review.findByPk(reviewId)
  if(!getreview){
    res.status(404)
    res.json({
      "message": "Review couldn't be found",
      "statusCode": 404
    })
  }
  if (!review || !stars || stars < 1 || stars > 5){
    res.status(400)
    res.json({
      "message": "Validation error",
      "statusCode": 400,
      "errors": {
        "review": "Review text is required",
        "stars": "Stars must be an integer from 1 to 5",
      }
    })
  }
  getreview.update({review, stars})
  await getreview.save()
  res.status(200)
  res.json(getreview)
})


router.delete('/:reviewId', requireAuth, restoreUser, async (req, res) => {
  const reviewId = req.params.reviewId
  const review = await Review.findByPk(reviewId)

  if (!review){
    res.status(404)
    res.json({
      "message": "Review couldn't be found",
      "statusCode": 404
    })
  }
  await review.destroy();
  res.status(200)
  res.json({
    "message": "Successfully deleted",
    "statusCode": 200
  })
})

  module.exports = router;

  router.post('/:spotId/reviews', restoreUser, requireAuth, async (req, res) => {
    const spot = req.params.id
    const user = req.user.id
    const { review, stars } = req.body
    const findid = await Review.findByPk(spot)
    if(!findid){
      res.status(404)
      res.json({
        "message": "Spot couldn't be found",
        "statusCode": 404
      })
    }
    const reviewed = await Review.findAll({
    where: {
      userId: user,
      spotId: spot
    }

  })
  if (reviewed){
    res.status(403);
    res.json({
      "message": "User already has a review for this spot",
      "statusCode": 403
    })
  }
  const createReview = Review.create({
    spotId: spot,
    userId: user,
    review,
    stars
  })
  res.status(201)
  res.json(createReview)
  })
