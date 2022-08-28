import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect, Route, Switch } from "react-router-dom";
import SignupFormPage from "./components/SignupFormPage";
import * as sessionActions from "./store/session";
import Navigation from "./components/Navigation";
import Spots from "./components/getAllSpots/getAllSpots";
import GetSpotbyId from "./components/getSpotId/SpotShowPage";
import CreateSpot from "./components/CreateSpotForm/CreateSpotForm";
import MyOwnedSpots from "./components/myOwnedSpotsForm/myOwnedSpots";
import EditSpotForm from "./components/CreateSpotForm/EditSpotForm";
import CurrentSpots from "./components/GetCurrentUserReview/CurrentUserReview";
import "./app.css";
function App() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const user = useSelector((state) => state.session.user);
  useEffect(() => {
    dispatch(sessionActions.restoreUser()).then(() => setIsLoaded(true));
  }, [dispatch]);

  // useEffect(() => {
  //   // dispatch(getSpotsById()) //works
  //   // dispatch(allSpots())
  //   dispatch(getSpotDetailById(2))
  // }, [dispatch])

  return (
    <div className="app">
      <Navigation isLoaded={isLoaded} />
      {isLoaded && (
        <Switch>
          <Route path="/signup">
            <SignupFormPage />
          </Route>
          <Route exact path="/">
            <Spots />
          </Route>
          <Route exact path={`/spots/:spotId`}>
            <GetSpotbyId />
          </Route>
          <Route exact path={`/createSpotForm`}>
            {user ? <CreateSpot /> : <Redirect to="/" />}
          </Route>
          <Route exact path="/myListings">
            {user ? <MyOwnedSpots /> : <Redirect to="/" />}
          </Route>
          <Route exact path="/editSpot/:spotId">
            {<EditSpotForm />}
          </Route>
          <Route exact path="/myReviews">
            {user ? <CurrentSpots /> : <Redirect to="/" />}
          </Route>
        </Switch>
      )}
    </div>
  );
}

export default App;
