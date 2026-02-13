import PropTypes from "prop-types";
import "./Skeleton.css";

export default function Skeleton({ className = "", style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

Skeleton.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};
