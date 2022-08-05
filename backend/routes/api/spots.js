const express = require('express')
const router = express.Router()
const { setTokenCookie, restoreUser, requireAuth} = require('../../utils/auth.js');
const { handleValidationErrors } = require('../../utils/validation');
const { check } = require('express-validator');
const {User, Booking, Spot, Image, Review, sequelize} = require('../../db/models');
const user = require('../../db/models/user.js');
const { Op } = require('sequelize')


//Get All Spots
router.get('/', async (req, res, next) => {
    const Allspots = await Spot.findAll({
      include: [
        { model: Review, attributes: [] },
        { model: Image, attributes: [], where: {previewImage: true} }
      ],
      attributes: {
        include: [
          [ sequelize.fn('AVG', sequelize.col('Reviews.stars')), 'avgRating' ],
          [ sequelize.literal('Images.url'), 'previewImage' ]
        ]
      },
      group: ['Spot.id'],
    })

    res.status(200)
    res.json({ Spot: Allspots })
  })

  // Get all spots owned by the current user
  router.get('/current', restoreUser, requireAuth, async (req,res) => {
    const ownedSpots = await Spot.findAll({
      where: {
        ownerId: req.user.id
      },
      include: [
        {model: Review, attributes: [] }
      ],
      attributes: {
        include: [
          [sequelize.fn('AVG', sequelize.col('Reviews.stars')), 'avgRating']
        ]
      },
      group: ['Spot.id'],

    })
    for (let i = 0; i < ownedSpots.length; i++){
      let spot = ownedSpots[i]
      let img = await Image.findOne({
        attributes: ['url'],
        where: { previewImage: true, spotId: spot.id}
      })
      spot.dataValues.previewImage = img
    }
    res.status(200)
    res.json({Spot: ownedSpots})

  })



// Get details of a spot from an id ****
router.get('/:spotId', async (req, res) => {
  const spotId = req.params.spotId
  let spots = await Spot.findOne(spotId, {
    where: {
      id: spotId
    },
    include: [
      { model: Review, attributes: [] },
      { model: Image, attributes: [], where: {previewImage: true} },
    ],
    attributes: {
      include: [
        [ sequelize.fn('AVG', sequelize.col('Reviews.stars')), 'avgRating' ],
        [ sequelize.fn('COUNT', sequelize.col('Reviews.stars'), 'numReviews')]
      ]
    },
    group: ['Spot.id'],
  });
  if (!spots) {
      res.status(404)
      return res.json({
          "message": "Spot couldn't be found"
      })
  }
})



// Create a spot
router.post('/', requireAuth, restoreUser, async (req, res) => {
  const ownersId = req.user.id
  const {address, city, state, country, lat, lng, name, description, price} = req.body
  const createdSpot = await Spot.create({
    ownerId: ownersId,
    address,
    city,
    state,
    country,
    lat,
    lng,
    name,
    description,
    price
  });

  res.status(201)
  res.json(createdSpot)
});

// Add an image to a spot based on the Spots Id ****

router.post('/:spotId/images', restoreUser, requireAuth, async (req, res) => {
  const spotId = req.params.spotId
  const currentUser = req.user.id
  const spot = await Spot.findByPk(spotId)

  if(spot.ownerId !== currentUser){
    res.status(404)
    res.json({
      "message": 'Spot could not be found'
    });
  }
  imagebody = req.body;
  imagebody.spotId = spotId;
  const reviewsId = await Review.findOne({
    where: { spotId: req.params.spotId }
  });
  let reviewId = null;
    if (reviewsId) {
        reviewId = reviewsId.spotId;
    };
console.log(reviewsId)
  let image = await Image.create(imagebody, {
    reviewId: reviewsId.spotId
  })
  image = await Image.findByPk(image.id)

  return res.json(image)

});

//Edit a spot
router.put('/:spotId',requireAuth, restoreUser, async (req, res) => {
  let spotId = req.params.spotId
  const { address, city, state, country, lat, lng, name, description, price } = req.body;
  const spot = await Spot.findByPk(spotId)
  if (!spot){
    res.status(404)
    res.json({
      "message": "Spot couldn't be found",
      "statusCode": 404
  });
  }
  if (!req.body){
    res.status(400);
    return res.json({
      "message": "Validation Error",
      "statusCode": 400,
      "errors": {
        "address": "Street address is required",
        "city": "City is required",
        "state": "State is required",
        "country": "Country is required",
        "lat": "Latitude is not valid",
        "lng": "Longitude is not valid",
        "name": "Name must be less than 50 characters",
        "description": "Description is required",
        "price": "Price per day is required"
      }
    })
  }
  spot.update({address, city, state,country, lat, lng, name, description, price})

  res.status(200);
  res.json(spot);
});

router.delete('/:spotId', requireAuth, async (req, res) => {
  const spotId = req.params.spotId
  const spot = await Spot.findByPk(spotId)
  if (!spot){
    res.status(404)
    res.json({
      "message": "Spot couldn't be found",
      "statusCode": 404
    });
  }
  await spot.destroy();
  res.status(200)
  res.json({
    "message": "Successfully deleted",
    "statusCode": 200
  })
});

//get all reviews by a Spots Id.
router.get('/:spotId/reviews', async (req, res) => {
  const spot = req.params.spotId
  const reviews = await Review.findByPk({
    where: {
      spotId: spot
    },
    include: [
      { model: User, attributes: ['id', 'firstName', 'lastName'] },
      { model: Image, attributes: ['id', ['reviewId', 'imageableId'], 'url'] },
    ],
    group: ['Review.id']
  })
  if (!reviews){
    res.status(404)
    res.json({
      "message": "Spot couldn't be found",
      "statusCode": 404
    })
  }
  res.status(200)
  res.json({Reviews: reviews})
})


//Create a Review for a Spot based on the Spot's id

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



//Get all Bookings for a Spot based on the Spot's id

router.get('/:spotId/bookings', restoreUser, requireAuth, async (req, res) =>{
  const userId = req.user.id
  const spotId = req.params.spotId
  const usersBookings = await Booking.findAll({
    where: {
      spotId: spotId
    },
    include:
      {model: User,
      attributes: ['id', 'firstName', 'lastName']}

  });
  const spots = await Spot.findOne({
    where: {
      ownerId: userId
    }
  })
  const bookings = await Booking.findAll({
    where: {
      spotId: spotId
    },
    attributes: [
      'id', 'spotId', 'userId', 'startDate', 'endDate'
    ]

  })
  if (!spots){
    res.status(404)
    res.json({
      "message": "Spot couldn't be found",
      "statusCode": 404
    })
  }
  if (spots.ownerId !== userId){
    res.status(200)
    res.json(usersBookings)
  } else {
    res.status(200)
    res.json(bookings)
  }
})

router.post('/:spotId/bookings', restoreUser, requireAuth, async (req, res) => {
  const spotId = req.params.spotId
  const userId = req.user.id
  const spot = await Spot.findByPk(spotId)
  if(!spot){
    res.status(404);
    res.json({
      "message": "Spot couldn't be found",
      "statusCode": 404
    })
  }
  if (Booking.endDate <= Booking.startDate){
    res.status(400)
    res.json({
      "message": "Validation error",
      "statusCode": 400,
      "errors": {
        "endDate": "endDate cannot be on or before startDate"
      }
    })
    const bookings = await Booking.findAll({
      where: {
        spotId: spotId
      }
    })
    if(bookings){
      res.status(403)
      res.json({
        "message": "Sorry, this spot is already booked for the specified dates",
        "statusCode": 403,
        "errors": {
          "startDate": "Start date conflicts with an existing booking",
          "endDate": "End date conflicts with an existing booking"
        }
      })
    } else {
      const createBooking = await Booking.create({
        spotId,
        userId,
        startDate,
        endDate
      })
      res.status(201)
      res.json(createBooking)
    }
  }
})


//Add Query Filters to Get All Spots.
router.get('/', async (req, res, next) => {
  const { size, page} = req.query
  if (!page) page = 0
  if(!size) size = 20

  page = parseInt(page)
  size = parseInt(size)

 let where = {}
 if(page >= 1 && size >= 1) {
  where.limit = size
  where.offset = size * (page - 1)
 }

  const Allspots = await Spot.findAll({
    include: [
      { model: Review, attributes: [] },
      { model: Image, attributes: [], where: {previewImage: true} }
    ],
    attributes: {
      include: [
        [ sequelize.fn('AVG', sequelize.col('Reviews.stars')), 'avgRating' ],
        [ sequelize.literal('Images.url'), 'previewImage' ]
      ]
    },
    group: ['Spot.id'],
    ...where
  })

  res.status(200)
  res.json({ Spot: Allspots })
})




module.exports = router
